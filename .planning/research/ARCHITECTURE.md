# Architecture Patterns: Staff Account Management

**Domain:** Staff account management layered onto an existing Nuxt 4 + Supabase loyalty platform
**Researched:** 2026-03-20
**Confidence:** HIGH — based on direct codebase analysis and verified Supabase Admin API documentation

---

## Context: What Already Exists

The staff management feature is an extension of an already-working system. Understanding the existing components prevents over-engineering.

**Existing infrastructure that directly applies:**

| Component | Location | Current State | Gap |
|-----------|----------|---------------|-----|
| `members` table | DB | Full RBAC with owner/admin/cashier roles and business/branch scoping | No `is_active` flag; no `display_name` |
| `requireMember()` / `requireOwner()` | `server/utils/auth.ts` | Authorization enforcement for all API routes | Does not check deactivation state |
| `useMember()` composable | `app/composables/useMember.ts` | List, invite, update, remove members | `inviteMember()` requires pre-existing `auth_user_id` — cannot create accounts |
| Members page UI | `app/pages/dashboard/[businessSlug]/members.vue` | Shows list, form, delete | Invite form is raw UUID input — not owner-friendly |
| `getServiceClient()` | `server/utils/supabase.ts` | Service role client for privileged DB ops | Not yet used for auth admin operations |
| Permission composable | `app/composables/usePermission.ts` | `canManageMembers` gate | No `canManageStaff` distinction needed — same gate |

---

## Recommended Architecture

The staff account management system adds **three new capability layers** on top of the existing member system:

1. **Auth provisioning layer** — server-side `auth.admin.*` calls for creating/updating/deleting Supabase Auth users
2. **Account state layer** — `is_active` flag in the `members` table (mirrors Supabase `ban_duration` but is the source of truth for UI)
3. **Staff-aware UI layer** — enhanced Members page that replaces the raw UUID invite form with a staff creation form

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard UI Layer                       │
│  app/pages/dashboard/[businessSlug]/members.vue             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Staff creation form (email + password + role/scope) │   │
│  │  Staff list (with name, status, action buttons)      │   │
│  │  Password reset dialog                               │   │
│  │  Deactivate / Delete actions                         │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ $fetch() via useMember() composable
┌────────────────────────▼────────────────────────────────────┐
│                  Composable / State Layer                    │
│  app/composables/useMember.ts (extended)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  createStaff(email, password, role, scopeType, scope) │  │
│  │  resetStaffPassword(memberId, newPassword)            │  │
│  │  setStaffActive(memberId, isActive)                   │  │
│  │  [existing] updateMember(), removeMember()            │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ H3 event handlers
┌────────────────────────▼────────────────────────────────────┐
│                   Server API Layer                           │
│                                                             │
│  POST   /api/staff              (create auth user + member) │
│  PUT    /api/staff/[id]/password (reset password)           │
│  PUT    /api/staff/[id]/status   (activate/deactivate)      │
│  [existing] DELETE /api/members/[id]  (delete member)       │
│                                                             │
│  All routes use: requireOwner() + getServiceClient()        │
└────────────────────────┬────────────────────────────────────┘
                         │ supabase.auth.admin.*
┌────────────────────────▼────────────────────────────────────┐
│                  Supabase Auth Admin API                     │
│  (service role key — server-only, never exposed to client)  │
│                                                             │
│  auth.admin.createUser({ email, password,                   │
│    email_confirm: true, user_metadata: { display_name } })  │
│  auth.admin.updateUserById(uid, { password })               │
│  auth.admin.updateUserById(uid, { ban_duration: '87600h'})  │ ← deactivate
│  auth.admin.updateUserById(uid, { ban_duration: 'none' })   │ ← reactivate
│  auth.admin.deleteUser(uid)                                 │
│                                                             │
│  Existing DB ops still use: getServiceClient() → Supabase   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Staff Provisioning API (`/api/staff`)

**Responsibility:** Create a fully provisioned staff account in a single atomic-ish operation.

**What it does:**
1. Validates the request body (email, password, role, scope_type, scope_id)
2. Calls `requireOwner()` to enforce authorization
3. Calls `supabase.auth.admin.createUser()` with `email_confirm: true` (staff don't need to verify email)
4. On success, inserts a `members` row linking the new `auth_user_id` to the business/branch
5. On member insert failure, calls `supabase.auth.admin.deleteUser()` to roll back (compensating transaction — Supabase Auth has no real transactions with PostgreSQL)

**Does not communicate with:** The client directly. Composable calls it via `$fetch`.

**Boundary:** This is the only component that ever calls `auth.admin.createUser`. No other route or composable should create auth users.

---

### 2. Staff Password Reset API (`/api/staff/[id]/password`)

**Responsibility:** Allow an owner to set a new password for any staff member.

**What it does:**
1. Looks up the `members` row by `id` to get `auth_user_id`
2. Calls `requireOwner()` using the resolved business context
3. Calls `supabase.auth.admin.updateUserById(authUserId, { password: newPassword })`

**Does not communicate with:** The staff member directly. Staff members never self-reset passwords.

**Boundary:** Owner-only. Never exposed to admin or cashier role.

---

### 3. Staff Status API (`/api/staff/[id]/status`)

**Responsibility:** Activate or deactivate a staff account without deleting it.

**What it does:**
1. Looks up the `members` row by `id` to get `auth_user_id` and business context
2. Calls `requireOwner()`
3. Sets `ban_duration` via `supabase.auth.admin.updateUserById()`:
   - Deactivate: `ban_duration: '87600h'` (10 years)
   - Reactivate: `ban_duration: 'none'`
4. Updates `members.is_active` to mirror the state (for UI display without re-querying Supabase Auth)

**Boundary:** The `ban_duration` approach is the only Supabase-supported mechanism for account suspension. Deleting and re-creating users is not equivalent (loses auth history).

---

### 4. Existing Member Delete API (`/api/members/[id]` DELETE)

**Responsibility:** Permanently remove a member from the business.

**Enhancement needed:** Currently only deletes the `members` row. The `auth.users` cascade (`ON DELETE CASCADE`) will delete the member row when the auth user is deleted — but the reverse is not true. The delete endpoint must also call `supabase.auth.admin.deleteUser(authUserId)` to fully clean up staff accounts.

**Boundary:** Existing endpoint. Add auth user deletion only for staff accounts (not owners — never delete the business owner's auth account through member removal).

---

### 5. Enhanced `useMember()` Composable

**Responsibility:** Client-side state management and API orchestration.

**Additions:**
- `createStaff(data)` → calls `POST /api/staff`
- `resetStaffPassword(memberId, newPassword)` → calls `PUT /api/staff/[id]/password`
- `setStaffActive(memberId, isActive)` → calls `PUT /api/staff/[id]/status`

**No state changes beyond what exists:** Uses existing `refresh()` pattern after mutations.

---

### 6. Enhanced Members Page UI

**Responsibility:** The sole UI entry point for all staff management actions.

**Replaces:** The raw UUID-based invite form (`inviteMember` with `auth_user_id` input).

**Adds:**
- Staff creation form: email, password (with show/hide), role selector, scope selector
- Per-member actions: reset password (dialog), toggle active/inactive, delete
- Visual status badge: active / inactive on each member card
- Display name next to UUID (requires fetching from `auth.users` metadata or storing in `members`)

**Does not add:** A new navigation section. Integrates into the existing members page.

---

### 7. Staff Login Page (`/staff/login`)

**Responsibility:** Dedicated authentication entry point for staff members.

**Why separate from `/login`:**
- `/login` currently redirects to `/dashboard/business` on success — wrong for cashiers who should land on `/cashier`
- Separate page allows role-based redirect without polluting the owner login flow
- Conceptually clean: staff are not self-service users

**What it does:**
- Same Supabase Auth `signInWithPassword()` call (identical to `/login`)
- After success, fetches `/api/members/me` to determine role
- Redirects: cashier → `/cashier`, admin → `/dashboard/[businessSlug]`

**Important:** `/login` continues to exist unchanged for owners.

---

## Data Flow

### Staff Creation Flow

```
Owner submits creation form
  → useMember.createStaff(email, password, role, scopeType, scopeId)
  → POST /api/staff
    → requireOwner(event, businessId)
    → supabase.auth.admin.createUser({ email, password, email_confirm: true })
    → db.from('members').insert({ auth_user_id: newUser.id, role, scope_type, scope_id })
    → [on member insert fail] supabase.auth.admin.deleteUser(newUser.id)
  → composable calls refresh()
  → Members list re-renders with new staff member
```

### Password Reset Flow

```
Owner clicks "Reset Password" on staff card
  → Dialog opens with new password input
  → useMember.resetStaffPassword(memberId, newPassword)
  → PUT /api/staff/[id]/password
    → Fetch member row to get auth_user_id + resolve business
    → requireOwner(event, businessId)
    → supabase.auth.admin.updateUserById(authUserId, { password: newPassword })
  → Toast confirmation
```

### Deactivation Flow

```
Owner clicks "Deactivate" on staff card
  → useMember.setStaffActive(memberId, false)
  → PUT /api/staff/[id]/status
    → Fetch member row → auth_user_id + business resolution
    → requireOwner(event, businessId)
    → supabase.auth.admin.updateUserById(authUserId, { ban_duration: '87600h' })
    → db.from('members').update({ is_active: false }).eq('id', memberId)
  → Refresh → member card shows "Inactive" badge

[If deactivated staff tries to log in]
  → supabase.auth.signInWithPassword() returns error
  → Staff sees login error (Supabase Auth blocks banned users)
```

### Staff Authentication Flow (Login)

```
Staff visits /staff/login
  → Submits email + password
  → supabase.auth.signInWithPassword() [same as owner login — same auth system]
  → On success: fetch /api/members/me to get role
  → Role = cashier → router.push('/cashier')
  → Role = admin → router.push('/dashboard/[businessSlug]')
  → On banned: Supabase returns auth error → show "Account disabled" message
```

### Delete Flow (Enhanced)

```
Owner clicks Delete on staff card
  → Confirm dialog
  → useMember.removeMember(memberId)
  → DELETE /api/members/[id]
    → Fetch member row → auth_user_id + business resolution
    → requireOwner(event, businessId)
    → [NEW] Check: if member is not an owner, delete auth user
    → supabase.auth.admin.deleteUser(authUserId)
    → db.from('members').delete().eq('id', id)  ← may be redundant (cascade)
  → Refresh
```

---

## Database Schema Changes

One migration is required:

```sql
-- Add is_active flag to members table for deactivation state
-- (mirrors ban_duration in Supabase Auth — stored locally for fast UI queries)
ALTER TABLE members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add display_name for staff (set during creation, shown in member list)
ALTER TABLE members ADD COLUMN display_name TEXT;

-- Index for filtering active/inactive members per business
CREATE INDEX idx_members_is_active ON members(is_active);
```

**Why mirror `is_active` in the DB when Supabase Auth already has `banned_until`:**
- Reading `banned_until` for every member in a list requires N calls to `auth.admin.getUserById()` — expensive
- A single `members` list query with `is_active` is O(1) per list load
- The DB value is the authoritative display state; Supabase Auth `ban_duration` is the enforcement mechanism

---

## Key Architectural Constraints

### Auth Admin API is Server-Only

`supabase.auth.admin.*` requires the service role key. All calls must go through `server/api/` endpoints. The client never calls Supabase directly for staff management (consistent with project architecture rules).

### Atomic-ish Staff Creation

Supabase Auth and PostgreSQL do not share a transaction boundary. Creating a user in Auth then failing the `members` insert leaves an orphaned auth user. The server endpoint must implement compensating deletion:

```typescript
const { data: authUser, error: authError } = await supabase.auth.admin.createUser(...)
if (authError) throw createError(...)

const { error: memberError } = await db.from('members').insert(...)
if (memberError) {
  await supabase.auth.admin.deleteUser(authUser.user.id) // compensate
  throw createError(...)
}
```

### Role-Scope Constraint (Existing DB Check Constraint)

The existing schema enforces:
- `cashier` must have `scope_type = 'branch'`
- `owner` must have `scope_type = 'business'`
- `admin` can be either

The staff creation form must enforce this UI-side: if role = cashier, force scope = branch and show branch selector.

### Owner Protection

The delete endpoint must never delete an owner's auth account through the member removal path. Guard:
```typescript
if (memberToDelete.role === 'owner') {
  throw createError({ statusCode: 403, message: 'Cannot delete owner accounts' })
}
```

Owners manage their own auth accounts separately.

---

## Patterns to Follow

### Pattern 1: Member-then-Auth Lookup (Used Everywhere)

**What:** API endpoints receive a `member.id` (UUID from the `members` table), not a raw `auth_user_id`. Endpoints fetch the member row first to get the `auth_user_id` and resolve the business context for authorization.

**Why:** Keeps the API surface clean. The composable/UI works with member IDs (stable UUIDs tied to business context), not auth UUIDs (which staff shouldn't see).

**Example pattern (existing, extend for new endpoints):**
```typescript
const { data: member } = await db
  .from('members')
  .select('*, branches!left ( business_id )')
  .eq('id', memberId)
  .maybeSingle()

// resolve businessId from member, then requireOwner(event, businessId)
```

### Pattern 2: Service Role for Auth Admin Operations

**What:** All `supabase.auth.admin.*` calls use `serverSupabaseServiceRole(event)`.

**Why:** The user-scoped client (`serverSupabaseClient(event)`) does not have admin auth privileges.

```typescript
const supabase = serverSupabaseServiceRole(event)
const { data, error } = await supabase.auth.admin.createUser(...)
```

### Pattern 3: Zod Validation at API Entry

**What:** Every new endpoint validates its request body with a Zod schema before any auth or DB operation.

**New schemas to add to `server/utils/validators.ts`:**
```typescript
export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(100),
  role: z.enum(['admin', 'cashier']),
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
  business_id: z.string().uuid(),
})

export const resetStaffPasswordSchema = z.object({
  password: z.string().min(8),
  business_id: z.string().uuid(),
})

export const setStaffStatusSchema = z.object({
  is_active: z.boolean(),
  business_id: z.string().uuid(),
})
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling auth.admin from the Frontend

**What:** Importing the service role key on the client to call `auth.admin.*` directly.

**Why bad:** Exposes the service role key in the browser. Full database access compromise.

**Instead:** All admin auth calls go through `server/api/` endpoints using `serverSupabaseServiceRole(event)`.

---

### Anti-Pattern 2: Storing Passwords Anywhere

**What:** Persisting staff passwords in the `members` table or any application table.

**Why bad:** Supabase Auth hashes passwords with bcrypt. Storing plaintext or your own hash alongside is redundant and dangerous.

**Instead:** Pass the password to `auth.admin.createUser()` or `auth.admin.updateUserById()` and let Supabase Auth handle storage. The application never sees or stores the password after the API call.

---

### Anti-Pattern 3: New Members Table Instead of Extending Existing

**What:** Creating a separate `staff_accounts` table parallel to `members`.

**Why bad:** The existing `members` table, `requireMember()`, `usePermission()`, RLS policies, and all authorization logic already handle owner/admin/cashier roles. Duplicating this creates two authorization paths that drift apart.

**Instead:** Add `is_active` and `display_name` columns to the existing `members` table. Keep one source of truth.

---

### Anti-Pattern 4: Skipping the Compensating Deletion

**What:** Creating an auth user, then returning success even if the `members` insert fails.

**Why bad:** Orphaned auth users accumulate. They can log in but hit 403s everywhere. Impossible to clean up without direct Supabase dashboard access.

**Instead:** Implement the compensating `deleteUser` call on `members` insert failure (see Atomic-ish Staff Creation section above).

---

### Anti-Pattern 5: Reusing `/login` for Staff

**What:** Redirecting both owners and staff to `/login`, then detecting role in `auth.ts` middleware.

**Why bad:** The post-login redirect in `auth.ts` currently goes to `/dashboard/business` (owner landing). Role detection in the middleware requires a Supabase member lookup that isn't available synchronously at middleware time.

**Instead:** Dedicated `/staff/login` page handles role detection post-auth in the page component where async operations are natural.

---

## Build Order (Phase Dependencies)

Components have hard dependencies. Build in this order:

```
1. DB Migration (is_active, display_name on members)
   ↓ unblocks everything

2. Server: POST /api/staff (create)
   - Requires: migration for display_name column
   - Requires: createStaffSchema in validators.ts
   ↓

3. Server: PUT /api/staff/[id]/password (reset password)
   - Requires: existing member lookup pattern
   ↓

4. Server: PUT /api/staff/[id]/status (activate/deactivate)
   - Requires: migration for is_active column
   ↓

5. Enhance DELETE /api/members/[id]
   - Requires: none (additive — add deleteUser call)
   ↓

6. Composable: extend useMember() with createStaff, resetStaffPassword, setStaffActive
   - Requires: all server endpoints above
   ↓

7. UI: Enhanced Members Page
   - Requires: composable extensions
   - Replaces raw UUID invite form with staff creation form
   - Adds action buttons per member card
   ↓

8. Staff Login Page (/staff/login)
   - Requires: server endpoints (to verify role post-login)
   - Independent of members page UI (can build in parallel with step 7)
```

**What can be parallelized:**
- Steps 2, 3, 4, 5 can be built independently once the migration (step 1) is done
- Step 8 (staff login) can be built in parallel with step 7 (members UI)

---

## Scalability Considerations

| Concern | At current scale (1-10 staff per business) | At scale (1000+ businesses) |
|---------|---------------------------------------------|------------------------------|
| Auth admin API calls | Fine — calls are per action, not per request | Supabase admin API has no documented rate limit per-call; batching not needed |
| `is_active` + `banned_until` sync | Manual two-step (DB + Auth) per status change | Consider a Supabase Edge Function trigger if sync drift becomes a problem |
| Member list query | One query joining branches — fine | Add composite index `(scope_type, scope_id, is_active)` if list gets large |
| Orphaned auth users | Compensating deletion handles normal cases | Admin scripts or Supabase dashboard needed for failure recovery at scale |

---

## Sources

- Supabase Admin API (createUser): https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase Admin API (updateUserById / ban_duration): https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- Supabase user deactivation patterns: https://github.com/orgs/supabase/discussions/9239
- Existing codebase: `server/utils/auth.ts`, `server/api/members/`, `app/composables/useMember.ts`
- Existing DB schema: `supabase/migrations/001_initial_schema.sql`
- Confidence: HIGH — all Supabase Admin API capabilities verified via official docs search; codebase analysis is direct
