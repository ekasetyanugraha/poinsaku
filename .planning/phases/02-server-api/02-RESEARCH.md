# Phase 2: Server API - Research

**Researched:** 2026-03-20
**Domain:** Nuxt 4 server routes, Supabase Auth Admin API, H3, Zod v4
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Endpoint Structure**
- New `/api/staff/` directory for all staff management endpoints — separate from existing `/api/members/`
- Endpoint map:
  - `POST /api/staff` — create staff account (auth user + member row)
  - `PUT /api/staff/[id]/password` — reset staff password
  - `PUT /api/staff/[id]/status` — deactivate/reactivate staff
  - `DELETE /api/staff/[id]` — permanently delete staff
  - `PUT /api/staff/[id]/branch` — reassign staff to different branch
- `[id]` refers to the members table primary key (not auth_user_id)
- Merge into `/api/staff/` only — existing `/api/members/` endpoints to be consolidated under `/api/staff/`

**Permission Scope**
- Owner-only for all staff management operations (create, reset password, deactivate, reactivate, delete, reassign)
- Use `requireOwner(event, businessId)` for all staff endpoints
- Only admin and cashier roles can be created through staff endpoints — owners cannot be created as "staff"
- Owner members are protected — staff endpoints reject operations targeting owner-role members (prevents self-lockout)

**Staff Creation Contract**
- All fields required: email, password, display_name (optional), role (admin | cashier), scope_type, scope_id
- Custom server-side password validation via Zod (minimum length + complexity rules beyond Supabase defaults)
- Response: minimal confirmation `{ id, email, created: true }` — client fetches full details separately
- Atomicity: if member insert fails after auth user creation, auto-rollback by deleting the auth user (no orphans)
- Uses `createAuthUser()` from Phase 1 for the Supabase Auth user creation step

**Delete & Cleanup**
- Hard delete: remove both the members table row AND the Supabase Auth user
- Email becomes immediately re-usable after deletion (per roadmap success criteria)
- No confirmation body required — just `DELETE /api/staff/[id]` with owner auth
- If member row deletion succeeds but auth user deletion fails: return success with warning (orphan auth user is harmless — no member row = no business access)
- Owner-role members cannot be deleted through staff endpoint (delete guard)

**Deactivation Mechanics**
- Deactivate: set `ban_duration: '87600h'` (10 years) on auth user AND flip `is_active = false` on members row
- Reactivate: unban auth user AND flip `is_active = true` on members row
- Both operations must update auth and DB together — partial state is handled gracefully

### Claude's Discretion
- Exact Zod schema definitions for each endpoint's request body
- Error handling patterns for partial failures (ban succeeded but DB update failed, etc.)
- Whether to add admin auth wrapper utilities (`deleteAuthUser`, `updateAuthUser`, `banUser`, `unbanUser`) in `server/utils/supabase.ts` or inline
- Password validation rules (minimum length, character requirements)
- Response shape details beyond the specified contract

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACCT-01 | Owner can create a staff account with email and password | `POST /api/staff` — `createAuthUser()` + member insert, atomicity via rollback |
| ACCT-02 | Owner can set display name during staff account creation | `display_name` field in `CreateStaffSchema`, inserted to members row |
| ACCT-03 | Owner can assign role (admin or cashier) during creation | `role: z.enum(['admin', 'cashier'])` in schema, rejects 'owner' |
| ACCT-04 | Owner can assign branch/business scope during creation | `scope_type` + `scope_id` with branch→business resolution pattern |
| MGMT-01 | Owner can reset a staff member's password | `PUT /api/staff/[id]/password` — `auth.admin.updateUserById(uid, { password })` |
| MGMT-02 | Owner can deactivate a staff account | `PUT /api/staff/[id]/status` with `action:'deactivate'` — ban_duration + is_active=false |
| MGMT-03 | Owner can reactivate a deactivated staff account | `PUT /api/staff/[id]/status` with `action:'reactivate'` — ban_duration='none' + is_active=true |
| MGMT-04 | Owner can permanently delete a staff account | `DELETE /api/staff/[id]` — member row delete + `auth.admin.deleteUser(uid)` |
| MGMT-05 | Owner can reassign a staff member to a different branch | `PUT /api/staff/[id]/branch` — update `scope_type` + `scope_id` on members row |
</phase_requirements>

---

## Summary

Phase 2 builds 5 server API endpoints under `/api/staff/` using established Nuxt 4 server route patterns. All endpoints follow the same handler skeleton already proven in Phase 1: Zod parse → `requireOwner()` → fetch target member (for business context) → execute operation → return response. The foundation utilities are already in place and working: `getServiceClient(event)`, `createAuthUser()`, `requireOwner()`, and the `MemberAccess` interface.

The key new capability is the Supabase Auth Admin API: `auth.admin.updateUserById()` and `auth.admin.deleteUser()`. These are typed, available on the service role client returned by `serverSupabaseServiceRole(event)`, and confirmed callable — Phase 1 already verified `serverSupabaseServiceRole(event).auth.admin.createUser()` works at runtime. The admin API surface is provided by `@supabase/auth-js` (installed as a dependency of `@supabase/supabase-js`), typed via `GoTrueAdminApi.d.ts`.

The project has no test framework installed. Nyquist validation is enabled in config, so Wave 0 of the plan must install a test runner. Given this is a server-route-only phase (no UI, no migrations), the most practical test approach is lightweight HTTP integration tests against a running dev server using the native `fetch` API, or unit tests of the Zod schema validators.

**Primary recommendation:** Add `deleteAuthUser()`, `updateAuthUserPassword()`, `banAuthUser()`, `unbanAuthUser()` wrappers in `server/utils/supabase.ts` alongside `createAuthUser()`. This keeps admin API calls centralized, testable, and consistent with the established pattern rather than scattering inline admin calls across five endpoint files.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt 4 (H3) | ^4.0.0 | Server route runtime | Already in project — `defineEventHandler`, `readBody`, `getRouterParam`, `createError` are auto-imported |
| `@supabase/auth-js` | (transitive) | Auth Admin API types + implementation | `GoTrueAdminApi` — `updateUserById`, `deleteUser` are typed and available |
| `@nuxtjs/supabase` | ^2.0.4 | `serverSupabaseServiceRole` composable | Already in project — confirmed callable for admin ops in Phase 1 |
| Zod | ^4.3.6 | Server-side schema validation | Already in project — used across all existing endpoints |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5 | Static typing | All server utils and endpoint files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Wrapper functions in `supabase.ts` | Inline admin calls per endpoint | Wrappers: testable, DRY, consistent error messages. Inline: slightly less indirection. Wrappers win at 5 endpoints. |
| `ban_duration: '87600h'` (10yr) | `ban_duration: 'none'` / short durations | 87600h is the project-decided format. `'none'` is the correct unban value (not `'0s'`). |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
server/
├── utils/
│   └── supabase.ts          # ADD: deleteAuthUser, updateAuthUserPassword, banAuthUser, unbanAuthUser
├── api/
│   └── staff/
│       ├── index.post.ts    # POST /api/staff (create)
│       └── [id]/
│           ├── password.put.ts  # PUT /api/staff/[id]/password
│           ├── status.put.ts    # PUT /api/staff/[id]/status
│           ├── branch.put.ts    # PUT /api/staff/[id]/branch
│           └── index.delete.ts  # DELETE /api/staff/[id]
```

Existing files to update or remove:

```
server/api/members/
├── index.post.ts     # DELETE — replaced by staff/index.post.ts
├── [id].delete.ts    # DELETE — replaced by staff/[id]/index.delete.ts
└── [id].put.ts       # DELETE or scope to branch-assignment only (MGMT-05 now in staff/[id]/branch.put.ts)
```

### Pattern 1: Standard Staff Endpoint Skeleton

Every staff endpoint follows this exact structure — no variations:

```typescript
// Source: Established in existing server/api/members/*.ts
export default defineEventHandler(async (event) => {
  // 1. Parse and validate input (GET: query params, mutations: body)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const parsed = SomeSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // 2. Fetch target member to resolve business context
  const { data: targetMember } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, branches!left(business_id)')
    .eq('id', id)
    .maybeSingle()

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Staff member not found' })
  }

  // 3. Resolve businessId
  const businessId = targetMember.scope_type === 'business'
    ? targetMember.scope_id
    : (targetMember.branches as { business_id: string } | null)?.business_id
  if (!businessId) {
    throw createError({ statusCode: 500, message: 'Cannot resolve business for this member' })
  }

  // 4. Assert owner
  await requireOwner(event, businessId)

  // 5. Guard: reject owner-role targets
  if (targetMember.role === 'owner') {
    throw createError({ statusCode: 403, message: 'Cannot modify owner accounts through staff endpoints' })
  }

  // 6. Execute operation
  // ... (endpoint-specific logic)

  // 7. Return response
  return { success: true }
})
```

### Pattern 2: Auth Admin Wrapper Functions (in `server/utils/supabase.ts`)

These extend the established `createAuthUser` pattern:

```typescript
// Source: GoTrueAdminApi.d.ts — confirmed typed interface
export async function deleteAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.deleteUser(authUserId)
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal menghapus akun auth.' })
  }
}

export async function updateAuthUserPassword(event: H3Event, authUserId: string, password: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { password })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal memperbarui password.' })
  }
}

export async function banAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { ban_duration: '87600h' })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal menonaktifkan akun.' })
  }
}

export async function unbanAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { ban_duration: 'none' })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal mengaktifkan akun.' })
  }
}
```

### Pattern 3: Atomicity for Staff Creation (create then rollback on failure)

```typescript
// Source: Established decision from CONTEXT.md + createAuthUser pattern
const authUser = await createAuthUser(event, { email, password, user_metadata: { display_name, role } })

const { data: member, error: insertError } = await db
  .from('members')
  .insert({ auth_user_id: authUser.id, role, scope_type, scope_id, display_name, invited_by: owner.authUserId })
  .select('id, email:auth_user_id')  // Note: email must come from authUser, not members
  .single()

if (insertError) {
  // Rollback: delete auth user to prevent orphan
  await deleteAuthUser(event, authUser.id).catch(() => {}) // best-effort, log but don't fail
  throw createError({ statusCode: 500, message: 'Gagal menyimpan data staf.' })
}

return { id: member.id, email: authUser.email, created: true }
```

### Pattern 4: Deactivation/Reactivation with Partial Failure Handling

```typescript
// Source: CONTEXT.md decision on deactivation mechanics
// Deactivate
await banAuthUser(event, targetMember.auth_user_id)  // throws on hard failure
const { error: dbError } = await db
  .from('members')
  .update({ is_active: false })
  .eq('id', targetMember.id)
if (dbError) {
  // Auth ban succeeded but DB write failed — log, return partial warning
  // is_active=true in DB + banned in Auth is an inconsistent state
  // requireMember() checks DB is_active, so deactivation still takes effect
  return { success: true, warning: 'Auth ban applied; DB status update failed.' }
}
return { success: true }
```

### Nuxt 4 File-Based Routing for Nested Routes

Nuxt 4 maps file names to HTTP methods and route parameters:

```
server/api/staff/[id]/password.put.ts   → PUT /api/staff/:id/password
server/api/staff/[id]/status.put.ts     → PUT /api/staff/:id/status
server/api/staff/[id]/branch.put.ts     → PUT /api/staff/:id/branch
server/api/staff/[id]/index.delete.ts   → DELETE /api/staff/:id
server/api/staff/index.post.ts          → POST /api/staff
```

`getRouterParam(event, 'id')` retrieves `:id` from the path in all `[id]` routes.

### Anti-Patterns to Avoid

- **Calling `auth.admin.*` without a service role client:** `serverSupabaseClient(event)` uses the user's JWT and does NOT have admin rights. Always use `getServiceClient(event)` for auth admin operations.
- **Using `auth_user_id` as the `[id]` path param:** The context decision is that `[id]` refers to the members table primary key. Always look up the member row first to get `auth_user_id`, then call the auth admin API with that UUID.
- **Returning a 500 for partial failures where the primary goal succeeded:** If member row delete succeeds but auth user delete fails, the staff member has no DB access — return `{ deleted: true }` with an optional warning, not a 500.
- **Skipping the owner-role guard:** Any endpoint targeting a member must check `targetMember.role !== 'owner'` before modifying auth or DB state. This prevents self-lockout via API misuse.
- **Re-using `memberSchema` from validators.ts for staff creation:** The existing schema accepts `auth_user_id` as input (old invite flow). The new `CreateStaffSchema` should accept `email + password` — the endpoint creates the auth user itself.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ban/unban auth users | Custom `banned_users` table + middleware | `auth.admin.updateUserById({ ban_duration })` | Supabase's native ban propagates to JWT validation immediately — no JWT expiry delay |
| Password reset | Custom token table + email flow | `auth.admin.updateUserById({ password })` | Admin API resets password server-side; no email roundtrip needed |
| Auth user deletion | Soft-delete `deleted_at` column | `auth.admin.deleteUser(uid)` with hard delete | Immediately frees the email address per MGMT-04 requirement |
| Input validation | Manual if/else type checks | Zod `safeParse` with `.flatten()` for error detail | Already established — consistent with all other endpoints in project |
| Business context resolution | Re-implementing scope lookup per endpoint | Shared pattern: `.select('*, branches!left(business_id)')` + conditional | Already used in `[id].delete.ts` and `[id].put.ts` — copy it |

**Key insight:** Supabase Auth's ban mechanism (`ban_duration`) invalidates active sessions server-side without waiting for JWT expiry. This is exactly what deactivation needs — banned users get 401 on next request even if their JWT hasn't expired yet.

---

## Common Pitfalls

### Pitfall 1: Incorrect Unban Value

**What goes wrong:** Using `ban_duration: '0s'` instead of `ban_duration: 'none'` to lift a ban.
**Why it happens:** Intuition says "zero duration = no ban." The `AdminUserAttributes` type accepts any string.
**How to avoid:** The TypeScript type is `ban_duration?: string | 'none'` — the documented way to unban is the literal string `'none'`. The `unbanAuthUser()` wrapper hardcodes this correctly.
**Warning signs:** Reactivation appears to succeed (no error) but the user remains banned.

### Pitfall 2: Using Wrong Client for Auth Admin Operations

**What goes wrong:** Calling `auth.admin.updateUserById()` on a user-scoped client (`serverSupabaseClient(event)`) — returns a 403 "Not allowed" error.
**Why it happens:** Both clients expose the same `.auth.admin` interface in TypeScript types, but only the service role client has permission.
**How to avoid:** All auth admin calls go through `getServiceClient(event)` — never `serverSupabaseClient(event)`. The `createAuthUser()` and new wrapper functions enforce this.

### Pitfall 3: Wrong `[id]` Semantics

**What goes wrong:** Passing `auth_user_id` (UUID from auth.users) as the `[id]` path param, when the endpoint expects the members table primary key.
**Why it happens:** The relationship between auth users and members rows involves two different UUIDs.
**How to avoid:** All staff endpoints fetch the member row first using `id` (members PK). The `auth_user_id` is extracted from the fetched row for use in auth admin calls.

### Pitfall 4: Orphaned Auth Users on Failed Member Insert

**What goes wrong:** `createAuthUser()` succeeds, but the subsequent `members` insert fails — leaving an auth user with no member row. That email cannot be re-registered (Supabase rejects duplicate email).
**Why it happens:** Two separate writes (auth API + database) with no distributed transaction.
**How to avoid:** On member insert failure, immediately call `deleteAuthUser(event, authUser.id)` before throwing. Use `.catch(() => {})` on the rollback so a rollback failure doesn't shadow the original error.

### Pitfall 5: Staff Self-Password-Reset

**What goes wrong:** A staff member with a valid session calls `PUT /api/staff/[id]/password` on their own member `[id]` and succeeds.
**Why it happens:** If permission check is `requireMember()` instead of `requireOwner()`, any authenticated member could update their own or others' passwords.
**How to avoid:** All staff endpoints use `requireOwner(event, businessId)` — not `requireMember()`. Staff with non-owner roles will receive a 403.

### Pitfall 6: Deactivated Staff Token Still Valid Until Expiry

**What goes wrong:** Setting `is_active = false` in the DB flips the flag but the staff member's current JWT may still be valid for minutes/hours.
**Why it happens:** Relying only on `is_active` DB column, without banning the auth user.
**How to avoid:** Deactivation MUST do both: `ban_duration: '87600h'` on auth user (immediate JWT rejection on next refresh) AND `is_active = false` on members row (caught by `requireMember()` active check). The auth ban is the fast-path; the DB column is the persistent state.

### Pitfall 7: Nuxt 4 Route File Naming

**What goes wrong:** Creating `server/api/staff/[id]/password.ts` instead of `server/api/staff/[id]/password.put.ts` — Nuxt registers it for ALL HTTP methods.
**Why it happens:** Forgetting to include the method suffix in the filename.
**How to avoid:** All mutation endpoints include the HTTP method in the filename: `.post.ts`, `.put.ts`, `.delete.ts`. The DELETE endpoint for `/api/staff/[id]` is `index.delete.ts`.

---

## Code Examples

Verified patterns from official sources and existing project code:

### Auth Admin: Update User Password

```typescript
// Source: @supabase/auth-js GoTrueAdminApi.d.ts (installed package)
const { data, error } = await client.auth.admin.updateUserById(
  authUserId,  // auth.users.id UUID
  { password: 'new-password-here' }
)
```

### Auth Admin: Ban User (Deactivate)

```typescript
// Source: AdminUserAttributes type in @supabase/auth-js types.d.ts
// ban_duration format: decimal numbers with unit suffix (ns, us, ms, s, m, h)
// '87600h' = 10 years — project-decided constant
const { error } = await client.auth.admin.updateUserById(
  authUserId,
  { ban_duration: '87600h' }
)
```

### Auth Admin: Unban User (Reactivate)

```typescript
// Source: AdminUserAttributes type — 'none' is the documented unban value
const { error } = await client.auth.admin.updateUserById(
  authUserId,
  { ban_duration: 'none' }
)
```

### Auth Admin: Delete User

```typescript
// Source: GoTrueAdminApi.d.ts
// deleteUser(id, shouldSoftDelete?)
// shouldSoftDelete defaults to false (hard delete — email immediately re-usable)
const { error } = await client.auth.admin.deleteUser(authUserId)
```

### Zod v4: CreateStaffSchema (Discretion Area)

```typescript
// Source: Established Zod patterns from server/utils/validators.ts + CONTEXT.md contract
export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    'Password must be at least 8 characters with uppercase, lowercase, and number'
  ),
  display_name: z.string().max(100).optional(),
  role: z.enum(['admin', 'cashier']),  // 'owner' is intentionally excluded
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    'Password must be at least 8 characters with uppercase, lowercase, and number'
  ),
})

export const updateStatusSchema = z.object({
  action: z.enum(['deactivate', 'reactivate']),
})

export const reassignBranchSchema = z.object({
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
})
```

### Branch→Business Resolution (existing pattern)

```typescript
// Source: server/api/members/[id].delete.ts (existing project code)
const { data: targetMember } = await db
  .from('members')
  .select('id, auth_user_id, role, scope_type, scope_id, branches!left(business_id)')
  .eq('id', id)
  .maybeSingle()

const resolvedBusinessId = targetMember.scope_type === 'business'
  ? (targetMember.scope_id as string)
  : ((targetMember.branches as { business_id: string } | null)?.business_id)
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Invite-by-UUID (`members/index.post.ts` requires `auth_user_id`) | Create-with-credentials (`staff/index.post.ts` creates auth user then member) | Phase 1 → Phase 2: complete ownership model |
| Member delete removes DB row only (`members/[id].delete.ts`) | Staff delete removes DB row AND auth user | Email immediately re-usable (MGMT-04) |
| No deactivation mechanism | `ban_duration` + `is_active` dual-write | Immediate session invalidation on deactivation |

**Deprecated/outdated:**
- `server/api/members/index.post.ts`: Replaced by `POST /api/staff`. The old endpoint requires a pre-existing `auth_user_id` as input — incompatible with the new credential-creation flow.
- `server/api/members/[id].delete.ts`: Replaced by `DELETE /api/staff/[id]`. Only deleted the members row; no auth user cleanup.
- `server/api/members/[id].put.ts`: Being replaced by `PUT /api/staff/[id]/branch` for reassignment. The generic PUT was too permissive.

---

## Open Questions

1. **GET /api/staff — list endpoint**
   - What we know: `GET /api/members` still exists and works for listing
   - What's unclear: CONTEXT.md says "existing `/api/members/` endpoints to be consolidated under `/api/staff/`" but Phase 2 roadmap only lists 5 mutation endpoints
   - Recommendation: Keep `GET /api/members` as-is for Phase 2; Phase 3 (UI) can drive whether a new `GET /api/staff` endpoint is needed. Don't block Phase 2 on this.

2. **Email field on staff creation response**
   - What we know: Response is `{ id, email, created: true }` per CONTEXT.md
   - What's unclear: The members table does not store email — it must be pulled from `authUser.email` returned by `createAuthUser()`
   - Recommendation: After `createAuthUser()` returns, capture `authUser.email` and include it in the response directly (not from DB query).

3. **Partial failure on deactivation: which state is "safe"?**
   - What we know: CONTEXT.md says "handle gracefully"
   - What's unclear: If ban succeeds but DB `is_active` update fails — which do we treat as canonical? The auth ban provides faster protection; `requireMember()` checks `is_active`.
   - Recommendation: Log the inconsistency and return `{ success: true, warning: 'DB state may be inconsistent — retry recommended' }`. The auth ban is the stronger protection; the inconsistency is operationally safe.

---

## Validation Architecture

> nyquist_validation is enabled in `.planning/config.json`

### Test Framework

No test framework is currently installed in the project. This phase is pure server-side (no migrations, no UI). The most pragmatic approach is **Vitest** with a lightweight setup that can call Nuxt's server handler functions directly via `$fetch` from `@nuxt/test-utils`, or validate Zod schemas as unit tests without a server.

| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed) |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run tests/unit/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACCT-01 | CreateStaffSchema rejects missing email/password | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| ACCT-02 | CreateStaffSchema accepts optional display_name | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| ACCT-03 | CreateStaffSchema rejects role='owner' | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| ACCT-04 | CreateStaffSchema validates scope_type + scope_id | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| MGMT-01 | ResetPasswordSchema enforces min length | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| MGMT-02 | UpdateStatusSchema accepts 'deactivate' | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| MGMT-03 | UpdateStatusSchema accepts 'reactivate' | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| MGMT-04 | ReassignBranchSchema validates scope_id as UUID | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |
| MGMT-05 | ReassignBranchSchema validates scope_type enum | unit | `npx vitest run tests/unit/validators.test.ts` | Wave 0 |

**Note:** Full endpoint integration testing (auth admin calls, DB operations) requires a live Supabase instance. These are best verified manually during implementation via the success criteria in ROADMAP.md. The unit tests above cover schema validation logic only and run without any external dependencies.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/validators.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual verification of each success criterion before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@vitest/ui` — install: `npm install -D vitest`
- [ ] `vitest.config.ts` — root config file
- [ ] `tests/unit/validators.test.ts` — Zod schema unit tests for all Phase 2 schemas
- [ ] `tests/unit/` — directory for unit test files

---

## Sources

### Primary (HIGH confidence)
- `/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts` — confirmed method signatures for `updateUserById`, `deleteUser`
- `/node_modules/@supabase/auth-js/dist/module/lib/types.d.ts` — confirmed `AdminUserAttributes` interface including `ban_duration?: string | 'none'` and `password` field
- Existing project code (`server/utils/supabase.ts`, `server/utils/auth.ts`, `server/utils/validators.ts`, `server/api/members/*.ts`) — confirmed patterns for handler structure, business resolution, error shapes
- `.planning/phases/02-server-api/02-CONTEXT.md` — locked decisions for all implementation choices

### Secondary (MEDIUM confidence)
- [Supabase JS Reference: updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) — confirmed ban_duration format, unban via 'none', password reset attributes
- [Supabase JS Reference: deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) — confirmed `shouldSoftDelete` param defaults to false (hard delete)
- [Nuxt Supabase: serverSupabaseServiceRole](https://supabase.nuxtjs.org/services/serversupabaseservicerole) — confirmed service role client exposes full admin API

### Tertiary (LOW confidence)
- None — all critical claims verified against installed package types or official documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; types confirmed from installed packages
- Architecture: HIGH — patterns directly copied from working Phase 1 code in project
- Auth Admin API: HIGH — TypeScript type definitions verified from installed `@supabase/auth-js`; ban_duration format verified from both official docs and type comments
- Pitfalls: HIGH — derived from actual type signatures and existing code patterns, not speculation

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (90 days — Supabase auth-js admin API is stable; Nuxt 4 H3 patterns are stable)
