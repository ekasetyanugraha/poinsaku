---
phase: quick
plan: 260324-glb
type: execute
wave: 1
depends_on: []
files_modified:
  - server/api/wishlist/index.get.ts
  - server/utils/auth.ts
  - app/pages/dashboard/wishlists.vue
  - app/layouts/dashboard.vue
  - app/middleware/role.ts
autonomous: true
requirements: [QUICK-260324-GLB]
must_haves:
  truths:
    - "Superadmin can see a list of all wishlist submissions at /dashboard/wishlists"
    - "Non-superadmin users cannot access the wishlists page (redirected away)"
    - "Non-superadmin users do not see the wishlists link in the sidebar"
    - "The API rejects non-superadmin requests with 403"
  artifacts:
    - path: "server/api/wishlist/index.get.ts"
      provides: "GET endpoint listing all wishlist_submissions"
    - path: "server/utils/auth.ts"
      provides: "requireSuperAdmin helper function"
    - path: "app/pages/dashboard/wishlists.vue"
      provides: "Dashboard page showing wishlist submissions table"
  key_links:
    - from: "app/pages/dashboard/wishlists.vue"
      to: "/api/wishlist"
      via: "useFetch GET"
      pattern: "useFetch.*api/wishlist"
    - from: "server/api/wishlist/index.get.ts"
      to: "requireSuperAdmin"
      via: "auth guard"
      pattern: "requireSuperAdmin"
    - from: "app/layouts/dashboard.vue"
      to: "/dashboard/wishlists"
      via: "sidebar nav item with isSuperAdmin guard"
      pattern: "isSuperAdmin"
---

<objective>
Create a superadmin-only dashboard page to view all wishlist submissions.

Purpose: Superadmins need visibility into collected wishlist leads. This page lists all entries from the `wishlist_submissions` table with name, email, company, industry, message, and submission date.

Output: GET API endpoint, dashboard page, sidebar navigation link, route guard -- all restricted to superadmin role.
</objective>

<execution_context>
@/Users/ekasetyanugraha/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ekasetyanugraha/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From server/utils/auth.ts:
```typescript
export async function requireUser(event: H3Event): Promise<User>
export async function requireMember(event: H3Event, businessId: string, opts?: { roles?: ('superadmin' | 'owner' | 'admin' | 'cashier')[] }): Promise<MemberAccess>
// NOTE: requireSuperAdmin does NOT exist yet -- Task 1 creates it
```

From server/utils/supabase.ts:
```typescript
export function getServiceClient(event: H3Event)  // returns Supabase service-role client
```

From app/composables/usePermission.ts:
```typescript
export function usePermission(): {
  isSuperAdmin: ComputedRef<boolean>
  // ... other permissions
}
```

From supabase/migrations/003_wishlist.sql (table schema):
```sql
CREATE TABLE wishlist_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  industry    TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Dashboard layout sidebar pattern (from app/layouts/dashboard.vue):
```typescript
const allNavItems = computed(() => [
  { to: `${basePath.value}`, label: 'Dashboard', icon: 'i-lucide-layout-dashboard', show: true },
  // ... items with `show: boolean` controlling visibility
])
const filteredNavItems = computed(() => allNavItems.value.filter(i => i.show))
```

Role middleware pattern (from app/middleware/role.ts):
```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/login')
  const { role, scopeType } = useAuth()
  // Route-specific role checks...
})
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create superadmin auth helper and GET /api/wishlist endpoint</name>
  <files>server/utils/auth.ts, server/api/wishlist/index.get.ts</files>
  <action>
1. In `server/utils/auth.ts`, add a `requireSuperAdmin` helper function:
   - Call `requireUser(event)` to get the authenticated user
   - Query `members` table via `getServiceClient(event)` for a record with `auth_user_id = user.id` AND `role = 'superadmin'` AND `is_active = true`
   - If not found or not active, throw `createError({ statusCode: 403, message: 'Forbidden' })`
   - Return the user object (the member check is just for authorization)

2. Create `server/api/wishlist/index.get.ts`:
   - Call `await requireSuperAdmin(event)` to enforce superadmin-only access
   - Use `getServiceClient(event)` to query `wishlist_submissions` table
   - Select all columns: `id, name, email, company, industry, message, created_at`
   - Order by `created_at` descending (newest first)
   - Return `{ data: submissions, total: count }` where count uses Supabase `{ count: 'exact', head: false }` option on the select
   - On error, throw `createError({ statusCode: 500, message: 'Gagal memuat data wishlist.' })`

Note: The existing `server/api/wishlist/index.post.ts` is a public endpoint for form submissions -- the new GET file sits alongside it. Nitro auto-imports server/utils/* so `requireSuperAdmin` needs no explicit import.
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && cat server/utils/auth.ts | grep -c "requireSuperAdmin" && cat server/api/wishlist/index.get.ts | grep -c "requireSuperAdmin"</automated>
  </verify>
  <done>GET /api/wishlist returns wishlist submissions for superadmins, 403 for others. requireSuperAdmin utility exists in server/utils/auth.ts.</done>
</task>

<task type="auto">
  <name>Task 2: Create wishlists dashboard page with sidebar nav and route guard</name>
  <files>app/pages/dashboard/wishlists.vue, app/layouts/dashboard.vue, app/middleware/role.ts</files>
  <action>
1. Create `app/pages/dashboard/wishlists.vue`:
   - `definePageMeta({ layout: 'dashboard', middleware: ['auth'] })`
   - Use `useFetch('/api/wishlist')` to load submissions on mount
   - Display a page header: "Wishlist Submissions" with total count subtitle (e.g., "42 pendaftar")
   - Render submissions in a list of UCard components (matching the glass-card pattern used in transactions.vue):
     - Each card shows: name (font-medium), email (text-muted), company (if present), industry (if present, as UBadge), message (if present, truncated), created_at formatted with `toLocaleString('id-ID')`
     - Layout: left side has name + email + company, right side has industry badge + date
   - Empty state: UIcon `i-lucide-clipboard-list` + "Belum ada pendaftar wishlist" text
   - Loading state: spinner icon (same pattern as transactions.vue)
   - All text in Indonesian to match the app's language

2. Update `app/layouts/dashboard.vue`:
   - Import `isSuperAdmin` from `usePermission()` (add to existing destructured imports on line ~137)
   - Add a new section BELOW the existing `filteredNavItems` nav block and ABOVE the "Mode Kasir" link divider:
     - Add a superadmin-only divider: `<div v-if="isSuperAdmin" class="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">`
     - Inside it, add a heading `<p class="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Super Admin</p>`
     - Add a NuxtLink to `/dashboard/wishlists` with icon `i-lucide-clipboard-list` and label "Wishlists", styled identically to the existing nav items (same classes), with `@click="sidebarOpen = false"`
   - This section is entirely hidden for non-superadmin users via `v-if="isSuperAdmin"`

3. Update `app/middleware/role.ts`:
   - Add a guard for `/dashboard/wishlists`: if `to.path.includes('/wishlists')` and `role.value !== 'superadmin'`, redirect to `/dashboard/business`
   - Place this check BEFORE the existing members/settings checks
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && test -f app/pages/dashboard/wishlists.vue && grep -c "isSuperAdmin" app/layouts/dashboard.vue && grep -c "wishlists" app/middleware/role.ts</automated>
  </verify>
  <done>Dashboard page at /dashboard/wishlists shows all wishlist submissions. Sidebar shows "Wishlists" link only for superadmins. Route middleware blocks non-superadmins from accessing the page.</done>
</task>

</tasks>

<verification>
- `npx nuxi typecheck` passes (or at minimum, no new type errors introduced)
- The GET endpoint file exists at `server/api/wishlist/index.get.ts` and uses `requireSuperAdmin`
- The page file exists at `app/pages/dashboard/wishlists.vue` with `useFetch('/api/wishlist')`
- The sidebar conditionally shows the wishlists link only when `isSuperAdmin` is true
- The role middleware redirects non-superadmin users away from `/dashboard/wishlists`
</verification>

<success_criteria>
- Superadmin sees "Wishlists" link in sidebar under a "Super Admin" section
- Navigating to /dashboard/wishlists shows all wishlist submissions in a card list, ordered by newest first
- Non-superadmin users cannot see the sidebar link or access the page
- API returns 403 for non-superadmin users
</success_criteria>

<output>
After completion, create `.planning/quick/260324-glb-create-a-new-page-in-the-dashboard-to-se/260324-glb-SUMMARY.md`
</output>
