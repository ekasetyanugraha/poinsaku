# Technology Stack — Staff Account Management

**Project:** Stampku — Staff Account Management Milestone
**Researched:** 2026-03-20
**Scope:** Additive stack for staff CRUD on top of the existing Nuxt 4 + Supabase platform

---

## Constraint First

The PROJECT.md is explicit: no new frameworks. The entire milestone is delivered using the existing stack. This document specifies which existing APIs to use, how to use them correctly, and what patterns to add — not what to install.

---

## Recommended Stack (Additive Layer)

### Auth Operations — Supabase Auth Admin API

| Capability | API | Notes |
|-----------|-----|-------|
| Create staff account | `supabase.auth.admin.createUser({ email, password, email_confirm: true })` | `email_confirm: true` skips email verification — critical for owner-created accounts |
| Reset staff password | `supabase.auth.admin.updateUserById(uid, { password })` | Server-side only; staff never initiates this |
| Deactivate staff | `supabase.auth.admin.updateUserById(uid, { ban_duration: '87600h' })` | 10-year ban = effective permanent deactivation; `'none'` reverses it |
| Reactivate staff | `supabase.auth.admin.updateUserById(uid, { ban_duration: 'none' })` | Lifts the ban |
| Delete staff | `supabase.auth.admin.deleteUser(uid, { shouldSoftDelete: false })` | Hard delete removes the row from auth.users; cascade on members table handles cleanup automatically |
| Prevent self-signup email use | `app_metadata.managed_by_owner: true` | Set at creation via `updateUserById`; stored in `raw_app_meta_data` which users cannot modify |

**Why `auth.admin` over alternatives:**
- `auth.admin` methods require the service role key, which is already available via `serverSupabaseServiceRole` in every server route
- `inviteUserByEmail()` is explicitly out of scope — it sends email links which contradicts the requirement that owners set passwords directly
- `auth.signUp()` requires the new account to confirm via email and cannot be used server-side without the service role

**Confidence:** HIGH — documented in official Supabase JS reference

**Access point:** `serverSupabaseServiceRole(event).auth.admin.*` — same pattern already used in `server/utils/supabase.ts` via `getServiceClient()`

---

### Account Deactivation — `ban_duration` Pattern

There is no native "disabled" boolean in Supabase Auth. The canonical community pattern (verified across multiple Supabase GitHub discussions) is:

- **Deactivate:** `ban_duration: '87600h'` (10 years; effectively permanent)
- **Reactivate:** `ban_duration: 'none'`

**Limitation (MEDIUM confidence):** There is an open GitHub issue (#1798, #29590) reporting that `ban_duration` set during `createUser` is not persisted correctly. Setting it via a subsequent `updateUserById` call works reliably. Do not combine account creation and deactivation in a single call.

**What ban_duration blocks:** Supabase rejects login attempts with a 400 error when `banned_until` is in the future. Sessions already in progress are NOT immediately invalidated — the user finishes their current session but cannot refresh or log in again.

**Tracking deactivation state:** Store `is_active` on the `members` table row (new boolean column). This lets the UI display status without a round-trip to `auth.admin.listUsers()` for every page load.

---

### Password Management — `app_metadata` Flag

To enforce that staff cannot change their own passwords:

1. At creation, call `supabase.auth.admin.updateUserById(uid, { app_metadata: { managed_by_owner: true } })` immediately after `createUser`
2. Add a server route guard on any future `/api/auth/change-password` route: check `auth.jwt() -> app_metadata.managed_by_owner` and reject 403 if true

**Why `app_metadata` not `user_metadata`:**
- `user_metadata` (`raw_user_meta_data`) can be written by the authenticated user via `supabase.auth.updateUser()` — an attacker could clear the flag
- `app_metadata` (`raw_app_meta_data`) is write-protected for regular users; only the service role can modify it

**Confidence:** HIGH — Supabase docs explicitly state this distinction

**Current gap:** The existing codebase has no `/api/auth/change-password` endpoint, so there is nothing to guard yet. The flag is a preventive measure for future routes and for the separate staff login page (see Login Page section below).

---

### New API Endpoints Required

All follow the existing `server/api/` pattern. No new libraries needed.

| File | Method | Purpose |
|------|--------|---------|
| `server/api/staff/index.post.ts` | POST | Create auth user + insert members row atomically |
| `server/api/staff/[id]/password.put.ts` | PUT | Owner resets password via `auth.admin.updateUserById` |
| `server/api/staff/[id]/status.put.ts` | PUT | Toggle deactivate/reactivate via `ban_duration` |
| `server/api/staff/[id].delete.ts` | DELETE | Delete auth user + members row |

**Why separate `/staff/` namespace instead of extending `/members/`:**
- `/members/` endpoints work with an existing `auth_user_id` — they assume the auth account already exists
- `/staff/` routes handle the new concern: creating and destroying auth accounts, which requires different permission checks and different error handling surface area
- Members listing (`GET /api/members`) remains unchanged — staff appear there as regular members

**Validator additions to `server/utils/validators.ts`:**

```typescript
export const staffCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt limit
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'cashier']),
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
  business_id: z.string().uuid(),
})

export const staffPasswordSchema = z.object({
  password: z.string().min(8).max(72),
  business_id: z.string().uuid(),
})

export const staffStatusSchema = z.object({
  is_active: z.boolean(),
  business_id: z.string().uuid(),
})
```

**Confidence:** HIGH — same Zod 4.3.6 already in use; pattern matches existing validators

---

### Database — One New Column

The `members` table needs one addition:

```sql
ALTER TABLE members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE members ADD COLUMN display_name TEXT;
```

- `is_active`: mirrors the auth ban state for UI display without extra auth.admin API calls
- `display_name`: staff name set at creation; auth.users has no first-class name field visible through the app

No new tables. No new joins. The `members` table already has everything else needed (role, scope_type, scope_id, auth_user_id).

**Confidence:** HIGH — examined schema directly

---

### Separate Staff Login Page

The requirement is a dedicated login URL for staff, separate from the owner/customer flow. This is pure Nuxt routing — no new libraries.

- New page: `app/pages/staff/login.vue`
- Same `supabase.auth.signInWithPassword()` call as `app/pages/login.vue`
- Different post-login redirect: staff go to `/cashier` or `/dashboard/{slug}` depending on role
- The `supabase.redirectOptions` in `nuxt.config.ts` does not need to change — the `/staff/login` page handles its own redirect logic

**Why a separate page instead of a query param on `/login`:**
- Cleaner UX separation (owners see "Create account" link; staff do not)
- Staff cannot navigate to `/register` from their login page
- Allows different branding/copy if needed later

**Confidence:** HIGH — existing pattern in codebase is straightforward

---

### UI — Existing Components Only

No new UI dependencies required. The existing shadcn-nuxt (via `@nuxt/ui 4.5.1`) already ships:

| Component | Used for |
|-----------|---------|
| `UModal` / `UDialog` | "Create staff" and "Reset password" dialogs |
| `UFormField` + `UInput` | Email, password, name fields |
| `USelect` | Branch assignment dropdown |
| `URadioGroup` | Role selection (admin / cashier) |
| `UBadge` | Active/inactive status indicator |
| `UButton` | All actions (create, reset, deactivate, delete) |
| `UCard` | Staff list rows (same as current member cards) |

The members page (`app/pages/dashboard/[businessSlug]/members.vue`) is extended in place, not replaced. The existing `useMember()` composable gets a new sibling `useStaff()` for the auth-account-aware operations.

**Confidence:** HIGH — components verified in existing codebase

---

## What NOT to Use

| Option | Why Not |
|--------|---------|
| `supabase.auth.admin.inviteUserByEmail()` | Sends email invite links — explicitly out of scope; owner creates full credentials |
| `supabase.auth.signUp()` | Requires user to confirm email; cannot be called server-side for a different user |
| Separate auth provider / JWT library | Overkill; Supabase Auth already handles everything |
| New UI component library | Existing shadcn-nuxt covers all needed components |
| Supabase Edge Functions | Unnecessary indirection; Nuxt server routes already run server-side with service role |
| `shouldSoftDelete: true` on deleteUser | Soft delete leaves a tombstone row and may confuse email uniqueness checks if the owner wants to recreate an account with the same email |

---

## Atomicity Concern

Creating a staff account requires two writes that must both succeed:
1. `auth.admin.createUser()` — creates the auth account
2. `INSERT INTO members` — links the account to the business

Supabase Auth does not participate in Postgres transactions. If step 2 fails, step 1 leaves an orphan auth user.

**Mitigation pattern (HIGH confidence):**
```
1. auth.admin.createUser() → get uid
2. INSERT INTO members WHERE auth_user_id = uid
3. If step 2 fails → auth.admin.deleteUser(uid) to clean up
```

This is a compensating transaction, not a true atomic commit. It handles the common failure modes (duplicate member, invalid scope) correctly. The window for a partial failure is small (two fast server-side calls in sequence).

---

## Versions (all locked to existing package.json)

| Package | Version | Role in this milestone |
|---------|---------|----------------------|
| `@nuxtjs/supabase` | `^2.0.4` | `serverSupabaseServiceRole` → `auth.admin.*` |
| `nuxt` | `^4.0.0` | Server routes for new staff endpoints |
| `zod` | `^4.3.6` | Validation schemas for new endpoints |
| `@nuxt/ui` | `^4.5.1` | Modal, form, badge UI components |
| `supabase` (CLI) | `^2.82.0` | Migration for new `members` columns |

No new packages to install.

---

## Sources

- Supabase JS Auth Admin reference: https://supabase.com/docs/reference/javascript/admin-api
- Supabase createUser reference: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase updateUserById reference: https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- Supabase deleteUser reference: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- User Management (app_metadata vs user_metadata): https://supabase.com/docs/guides/auth/managing-user-data
- Supabase disable/deactivate user discussion: https://github.com/orgs/supabase/discussions/9239
- ban_duration bug report: https://github.com/supabase/supabase/issues/29590
- serverSupabaseServiceRole docs: https://supabase.nuxtjs.org/services/serversupabaseservicerole
- Zod v4 + Nuxt 4 validation: https://humanonlyweb.com/blog/validating-api-routes-in-nuxt-with-zod
