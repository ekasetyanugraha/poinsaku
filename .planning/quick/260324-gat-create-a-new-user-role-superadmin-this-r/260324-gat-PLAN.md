---
phase: quick
plan: 260324-gat
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/004_superadmin_role.sql
  - server/utils/auth.ts
  - server/utils/validators.ts
  - app/composables/usePermission.ts
  - app/middleware/auth.ts
  - app/middleware/role.ts
  - app/types/database.types.ts
  - server/api/staff/me.get.ts
autonomous: true
requirements: [QUICK-SUPERADMIN]
must_haves:
  truths:
    - "A member with role 'superadmin' can access any business endpoint without being a member of that business"
    - "superadmin has all permissions (owner-level and above) on the client side"
    - "superadmin can only be created via direct DB alteration — no API or UI path exists"
    - "Existing owner/admin/cashier roles continue to work unchanged"
  artifacts:
    - path: "supabase/migrations/004_superadmin_role.sql"
      provides: "DB enum alteration adding superadmin to member_role, updated CHECK constraint"
    - path: "server/utils/auth.ts"
      provides: "superadmin bypass in requireMember — skips business-scoped lookup, returns full access"
    - path: "app/composables/usePermission.ts"
      provides: "superadmin treated as having all permissions"
  key_links:
    - from: "server/utils/auth.ts"
      to: "supabase members table"
      via: "requireMember queries members table for superadmin role"
      pattern: "role.*superadmin"
    - from: "app/composables/usePermission.ts"
      to: "server/api/staff/me.get.ts"
      via: "useAuth fetches /api/staff/me which returns role"
      pattern: "superadmin"
---

<objective>
Add a `superadmin` role to the RBAC system. Superadmins have unrestricted access to all businesses and all data. This role is only assignable via direct database manipulation (manual INSERT/UPDATE on the members table) — no API or UI creation path.

Purpose: Enable platform-level administration for the app owner without being tied to a specific business.
Output: DB migration, updated auth utilities, updated client-side permission checks.
</objective>

<context>
@.planning/STATE.md
@server/utils/auth.ts
@server/utils/validators.ts
@app/composables/usePermission.ts
@app/composables/useAuth.ts
@app/middleware/auth.ts
@app/middleware/role.ts
@app/types/database.types.ts
@server/api/staff/me.get.ts
@supabase/migrations/001_initial_schema.sql

<interfaces>
From server/utils/auth.ts:
```typescript
export interface MemberAccess {
  id: string
  authUserId: string
  role: 'owner' | 'admin' | 'cashier'   // ADD 'superadmin'
  scopeType: 'business' | 'branch'
  scopeId: string
  businessId: string
  branchId: string | null
  isActive: boolean
  displayName: string | null
}

export async function requireMember(
  event: H3Event,
  businessId: string,
  opts?: { roles?: ('owner' | 'admin' | 'cashier')[] },  // ADD 'superadmin'
): Promise<MemberAccess>

export async function requireOwner(event: H3Event, businessId: string)
```

From server/utils/validators.ts:
```typescript
export const memberSchema = z.object({
  role: z.enum(['owner', 'admin', 'cashier']),  // ADD 'superadmin'
  ...
})
// NOTE: createStaffSchema should NOT include 'superadmin' — manual DB only
```

From app/composables/usePermission.ts:
```typescript
export function usePermission() {
  const isOwner = computed(() => role.value === 'owner')
  // Need: isSuperAdmin + superadmin grants all permissions
}
```

DB CHECK constraint from 001_initial_schema.sql (line 99-103):
```sql
CHECK (
  (role = 'owner' AND scope_type = 'business') OR
  (role = 'cashier' AND scope_type = 'branch') OR
  (role = 'admin')
)
```
Must add: `(role = 'superadmin' AND scope_type = 'business')`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: DB migration and server-side superadmin support</name>
  <files>supabase/migrations/004_superadmin_role.sql, server/utils/auth.ts, server/utils/validators.ts, server/api/staff/me.get.ts</files>
  <action>
1. Create `supabase/migrations/004_superadmin_role.sql`:
   - Add 'superadmin' to the `member_role` enum: `ALTER TYPE member_role ADD VALUE 'superadmin';`
   - Drop and recreate the CHECK constraint on `members` table to allow `(role = 'superadmin' AND scope_type = 'business')`. The existing constraint name can be found by checking pg_constraint or using the table-level CHECK syntax. Use: `ALTER TABLE members DROP CONSTRAINT members_check; ALTER TABLE members ADD CONSTRAINT members_check CHECK ((role = 'owner' AND scope_type = 'business') OR (role = 'cashier' AND scope_type = 'branch') OR (role = 'admin') OR (role = 'superadmin' AND scope_type = 'business'));`
   - NOTE: Do NOT modify any RLS policies — server API uses service role client which bypasses RLS. Superadmin does not need RLS changes.

2. Update `server/utils/auth.ts`:
   - Add `'superadmin'` to the `MemberAccess.role` union type: `'superadmin' | 'owner' | 'admin' | 'cashier'`
   - Add `'superadmin'` to the `opts.roles` parameter type in `requireMember`
   - Add superadmin bypass logic in `requireMember`: Before the business-scoped member lookup, query the members table for a record with `auth_user_id = user.id` AND `role = 'superadmin'`. If found and is_active, return a MemberAccess object with `role: 'superadmin'`, `scopeType: 'business'`, `scopeId: businessId`, `businessId: businessId`, `branchId: null`. This gives superadmin access to ANY business passed in. The role check (`opts.roles`) should still apply — if caller requires `{ roles: ['cashier'] }` specifically, superadmin should NOT match (preserve explicit role checks). However, when roles includes 'owner' or 'admin', superadmin should implicitly pass. Implementation: after getting superadmin member, if `opts?.roles` is set, check if it includes 'superadmin' OR includes 'owner' (since superadmin is owner-level+). If the role check fails, fall through to normal member lookup.
   - Do NOT change `requireOwner` — it calls `requireMember` with `{ roles: ['owner'] }`, and the superadmin bypass should treat superadmin as passing 'owner' checks.

3. Update `server/utils/validators.ts`:
   - Add `'superadmin'` to the `memberSchema.role` enum: `z.enum(['superadmin', 'owner', 'admin', 'cashier'])`
   - Do NOT add 'superadmin' to `createStaffSchema.role` — superadmin is manual DB only

4. Update `server/api/staff/me.get.ts`:
   - Handle superadmin scope resolution: when `member.role === 'superadmin'`, the member may be scoped to a business that acts as their "home" business, so the existing business slug resolution logic works as-is. No special handling needed since superadmin uses scope_type='business'. Just verify the role type flows through correctly.
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && npx nuxi typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>
    - member_role enum includes 'superadmin' in migration
    - CHECK constraint allows superadmin with scope_type='business'
    - MemberAccess type includes 'superadmin'
    - requireMember grants superadmin access to any businessId
    - createStaffSchema does NOT include 'superadmin'
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Client-side permission and middleware updates</name>
  <files>app/composables/usePermission.ts, app/middleware/auth.ts, app/middleware/role.ts, app/types/database.types.ts</files>
  <action>
1. Update `app/types/database.types.ts`:
   - Find the `member_role` enum definition (line ~808): change `"owner" | "admin" | "cashier"` to `"superadmin" | "owner" | "admin" | "cashier"`
   - Find the enum array (line ~955): change `["owner", "admin", "cashier"]` to `["superadmin", "owner", "admin", "cashier"]`

2. Update `app/composables/usePermission.ts`:
   - Add `isSuperAdmin` computed: `computed(() => role.value === 'superadmin')`
   - Update ALL permission computeds to include superadmin:
     - `canDelete`: `role.value === 'owner' || role.value === 'superadmin'`
     - `canManageMembers`: add `role.value === 'superadmin' ||` at the start
     - `canManageSettings`: add `role.value === 'superadmin' ||` at the start
     - `canManagePrograms`: add `role.value === 'superadmin' ||` at the start
     - `canViewTransactions`: remains `!!role.value` (superadmin is truthy, already works)
   - Export `isSuperAdmin` in the return object

3. Update `app/middleware/auth.ts`:
   - In the cashier redirect block (line 13-18), also exempt superadmin: change `if (role.value === 'cashier')` to `if (role.value === 'cashier')` — this is already correct since superadmin is NOT 'cashier'. No change needed here.

4. Update `app/middleware/role.ts`:
   - In both the `/members` and `/settings` path checks, add `role.value === 'superadmin'` as an allowed role. Change:
     `!(role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business'))`
     to:
     `!(role.value === 'superadmin' || role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business'))`
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && npx nuxi typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>
    - usePermission exposes isSuperAdmin computed
    - superadmin has all permission flags set to true
    - role.ts middleware allows superadmin to access members and settings pages
    - database.types.ts includes 'superadmin' in member_role enum
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx nuxi typecheck`
2. Grep for 'superadmin' across codebase confirms presence in all expected files:
   - `grep -r "superadmin" server/utils/auth.ts server/utils/validators.ts app/composables/usePermission.ts app/middleware/role.ts app/types/database.types.ts supabase/migrations/004_superadmin_role.sql`
3. Grep confirms 'superadmin' is NOT in createStaffSchema:
   - `grep -A5 "createStaffSchema" server/utils/validators.ts` should show only `['admin', 'cashier']`
4. Manual DB test (for user): After running migration, insert a superadmin member row manually, log in, and verify access to any business dashboard.
</verification>

<success_criteria>
- DB migration adds 'superadmin' to member_role enum and updates CHECK constraint
- Server auth utils grant superadmin access to any business (cross-business access)
- Client permissions treat superadmin as having all capabilities
- No API or UI path exists to create a superadmin (createStaffSchema unchanged)
- All existing roles (owner, admin, cashier) continue to work unchanged
- TypeScript compilation passes
</success_criteria>

<output>
After completion, create `.planning/quick/260324-gat-create-a-new-user-role-superadmin-this-r/260324-gat-SUMMARY.md`
</output>
