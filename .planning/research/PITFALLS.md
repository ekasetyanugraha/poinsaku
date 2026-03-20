# Domain Pitfalls: Staff Account Management

**Domain:** Staff account management in Supabase + Nuxt 4 loyalty platform
**Researched:** 2026-03-20
**Confidence:** HIGH — findings corroborated across official Supabase docs, GitHub issues, and codebase analysis

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or broken auth flows.

---

### Pitfall 1: Missing `email_confirm: true` on Admin User Creation

**What goes wrong:** `supabase.auth.admin.createUser({ email, password })` creates an unconfirmed account. Even if the project has "Confirm Email" disabled globally, users created without `email_confirm: true` may get "Email not confirmed" errors on sign-in — documented in [supabase/supabase#29632](https://github.com/supabase/supabase/issues/29632).

**Why it happens:** The admin API does not auto-confirm email by default. Global email confirmation settings apply to self-registration flows, not admin-created accounts.

**Consequences:** Staff cannot log in at all. Debugging is non-obvious — the error looks like a credential problem, not a confirmation problem.

**Prevention:** Always pass `email_confirm: true` in the admin create call:
```typescript
await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,  // Required — do not omit
})
```

**Detection:** Staff logs in and receives "Email not confirmed" despite correct credentials. Test this in the first implementation pass, not just at the end.

**Phase:** Account creation endpoint (Phase 1, day 1 of implementation).

---

### Pitfall 2: Non-Atomic Auth User + Member Record Creation

**What goes wrong:** Creating the Supabase auth user and then inserting the `members` row are two separate operations. If the `members` insert fails (constraint violation, network error, logic bug), an orphaned auth user exists with no business membership — the account is inaccessible and cannot log in usefully, but occupies an email address permanently.

**Why it happens:** `supabase.auth.admin.createUser` operates in the auth schema; `members` insert operates in public schema. There is no cross-schema transaction boundary available from the JavaScript client.

**Consequences:** Orphaned auth users accumulate. The email address is locked (re-creating the account with the same email fails). Manual cleanup required in the Supabase dashboard.

**Prevention:** Implement compensating logic in the server endpoint:
```typescript
const { data: authUser, error: authError } = await adminClient.auth.admin.createUser(...)
if (authError) throw createError(...)

try {
  await db.from('members').insert({ auth_user_id: authUser.user.id, ... })
} catch (memberError) {
  // Compensate: delete the auth user to avoid orphan
  await adminClient.auth.admin.deleteUser(authUser.user.id)
  throw createError({ statusCode: 500, message: 'Failed to create staff member' })
}
```

**Detection:** Email address already exists error when trying to re-create a staff member who was previously created but has no `members` row.

**Phase:** Account creation endpoint. Must be implemented from day 1 — not a later hardening step.

---

### Pitfall 3: Deleting a Member Row Without Deleting the Auth User

**What goes wrong:** The existing `DELETE /api/members/[id]` removes the `members` row but leaves the Supabase auth user intact. For the new staff accounts (owner-created, not self-registered), this means the auth user lingers with no associated membership — they cannot access the app, but the email address is permanently locked and the Supabase project accrues ghost users.

**Why it happens:** The existing delete endpoint was designed for the invitation model where auth users are self-owned. Staff accounts are a different ownership model — the business owns the account lifecycle, not the user.

**Consequences:** Deleted staff can never be re-added with the same email. Owner sees "ghost" auth users in Supabase dashboard. Email address pool gets polluted.

**Prevention:** The new staff delete endpoint (or a flag on the existing one) must call `supabase.auth.admin.deleteUser(auth_user_id)` after successfully deleting the members row — or vice versa with compensating rollback. Keep the existing endpoint for non-staff members (invited via external accounts).

**Detection:** Owner tries to re-add a deleted staff member using the same email and receives a duplicate email error.

**Phase:** Staff delete endpoint. Requires distinguishing "owner-created staff accounts" from "externally-invited members" — consider an `is_managed_account` boolean on the `members` table, or a separate `managed_staff` table.

---

### Pitfall 4: Using `ban_duration` for Deactivation Without Understanding the Expiry Limitation

**What goes wrong:** `supabase.auth.admin.updateUserById(id, { ban_duration: 'X' })` uses a time-based duration string (e.g., `'87600h'` for ~10 years). There is no native "indefinitely banned" flag. If the workaround duration expires, the account reactivates silently — no event fires, no notification.

**Why it happens:** Supabase ban_duration is designed for temporary bans; the indefinite use case requires a workaround. Issue [supabase/auth#1798](https://github.com/supabase/auth/issues/1798) confirms ban_duration does not persist in some edge cases.

**Consequences:** A deactivated staff account may regain access after years without the owner explicitly reactivating it. For a loyalty platform handling financial transactions (cashback, redemptions), this is a security risk.

**Prevention:**
- Use `'87600h'` (10 years) as the de facto indefinite ban value.
- Mirror deactivation state in your own schema — add an `is_active` boolean to `members` and check it server-side in `requireMember()` before allowing any action. This provides a defense-in-depth that does not rely solely on Supabase's ban mechanism.
- The `requireMember` check should fail with 403 if `is_active = false`, regardless of auth token validity.

**Detection:** Warning sign — if you only store deactivation state in Supabase auth (no local schema column), you have no fallback. Add an integration test that verifies a deactivated member's API calls return 403.

**Phase:** Staff deactivation endpoint + `requireMember()` update.

---

### Pitfall 5: Active JWT Remains Valid After Deactivation or Deletion

**What goes wrong:** Banning or deleting a Supabase auth user does not immediately invalidate their issued JWT access token. The token remains cryptographically valid until its `exp` claim (typically 1 hour). A deleted/deactivated cashier can continue making API requests within that window.

**Why it happens:** Supabase (and JWTs in general) are stateless. Sign-out revokes the refresh token but the short-lived access token is not checked against a revocation list by default.

**Consequences:** In a loyalty context, a deactivated cashier could continue stamping cards or processing transactions for up to 1 hour after deactivation. This is particularly relevant if a dishonest employee is suspected and the owner deactivates them in response.

**Prevention:**
- The `is_active` column on `members` (see Pitfall 4) mitigates this completely — every API request goes through `requireMember()`, which queries the database. An `is_active = false` check catches deactivated members even with valid JWTs.
- This is already how the app is architectured (all ops through `server/api/`), so the mitigation is simply ensuring the DB-level check exists and is not skippable.

**Detection:** If `requireMember()` only checks the auth token and not a local `is_active` flag, the deactivation window exists. Audit every server endpoint that a cashier calls.

**Phase:** Must be baked into the deactivation design from the start, not added after.

---

### Pitfall 6: Password Reset Bypassed by Staff via `updateUser` on the Client

**What goes wrong:** Supabase's standard `supabase.auth.updateUser({ password: newPassword })` is callable from any authenticated client. A cashier who discovers this API can change their own password — directly violating the "staff cannot change their own passwords" requirement.

**Why it happens:** The client-side Supabase SDK exposes `updateUser()` to any authenticated session. There is no Supabase-level flag to restrict password self-modification for specific users.

**Consequences:** Staff gain credential autonomy the business owner cannot revoke. The owner's ability to lock out misbehaving staff is undermined.

**Prevention:**
- The app already follows the architecture rule: all data operations through `server/api/`. There must be **no** client-side call to `supabase.auth.updateUser()` for password changes.
- Owner password-reset endpoint: use `supabase.auth.admin.updateUserById(id, { password: newPassword })` server-side only.
- Do not create a self-service password change endpoint for cashier/admin roles — it is explicitly out of scope per PROJECT.md.
- Add a middleware or server-side note: if a request to update auth user data is detected, verify the requester is the owner acting on behalf of staff, not the staff member acting on themselves.

**Detection:** Search for any client-side usage of `supabase.auth.updateUser()` in composables or pages. This call must not exist for staff-facing views.

**Phase:** Awareness issue — the architecture already prevents this, but it must be documented and enforced during code review.

---

## Moderate Pitfalls

Mistakes that cause broken UX, data inconsistency, or edge-case failures.

---

### Pitfall 7: `members.vue` Invite Form Currently Accepts Raw UUIDs — Not Suitable for Staff Creation

**What goes wrong:** The existing invite form (`members.vue`) has a plain text field for `auth_user_id`. This was acceptable when inviting users who already had accounts. For staff creation (owner creates the account), the flow changes: the owner enters email + password, the server creates the auth user and returns the `auth_user_id`, then inserts the member. The old form paradigm does not fit.

**Why it happens:** The existing UI was designed for the invitation model. Staff creation requires a new form field set (email, password, role, scope) and a different API sequence.

**Consequences:** If the old form is reused without modification, owners will be confused by "User ID" fields, and the flow breaks.

**Prevention:** Replace or augment the invite section with a "Create Staff Account" form with email + password + role + branch fields. Keep the old raw-UUID invite path behind a separate toggle only if external invitations are still supported.

**Phase:** Members page UI update.

---

### Pitfall 8: Cashier Scope Constraint Violation Not User-Friendly

**What goes wrong:** The DB has a `CHECK` constraint: `cashier` must be scoped to `branch`, not `business`. If the UI allows selecting "business" scope for a cashier role, the insert will fail with a Postgres constraint error — surfaced as a 500 with a raw DB message.

**Why it happens:** The schema enforces this at the DB level, but the UI form does not enforce it at the selection level.

**Consequences:** Owner selects cashier + business scope, gets a cryptic error. The DB constraint is correct — the UI needs to enforce it proactively.

**Prevention:** In the staff creation form, dynamically disable the "business" scope option when role = "cashier". Per PROJECT.md, the requirement is "one staff member belongs to exactly one branch" for cashiers, so this is already scoped — but the UI must enforce it.

**Detection:** Try to create a cashier with business scope — the backend returns 500 instead of 400 with a meaningful message. Add server-side validation that returns a clear 400 before hitting the DB.

**Phase:** Staff creation endpoint + form UI.

---

### Pitfall 9: Admin Role Scope Ambiguity — Business vs Branch Admin

**What goes wrong:** The `canManageMembers` permission allows business-scoped admins to manage staff. If a branch-scoped admin is created, they cannot manage members — but the UI may not make this distinction clear. An admin assigned at branch scope might reasonably expect to manage cashiers at that branch.

**Why it happens:** The existing `usePermission()` composable correctly checks `scopeType === 'business'` for member management, but the staff creation UI may present "Admin" role + "Branch" scope as a valid combination without explaining its implications.

**Consequences:** Business owner creates a "branch admin" expecting them to manage that branch's staff, but the admin cannot. Confusion, support requests.

**Prevention:** In the staff creation form, add helper text: "Admins scoped to a branch cannot manage other members." Or enforce that admins must be business-scoped (align UI with the real constraint).

**Phase:** Staff creation form UI.

---

### Pitfall 10: Deactivated Staff Still Appear in Members List Without Visual Indicator

**What goes wrong:** If `is_active` is added to `members` but the `members.vue` UI is not updated to show deactivation state, owners see a list of members with no way to distinguish active from deactivated ones.

**Why it happens:** UI is written before the deactivation column is factored in.

**Consequences:** Owner cannot tell who is deactivated, cannot reactivate by mistake, and the feature appears broken even when it is working.

**Prevention:** Design the members list to show an "Inactive" badge when `is_active = false`. Include reactivate/deactivate toggle buttons from the beginning.

**Phase:** Staff management UI.

---

## Minor Pitfalls

---

### Pitfall 11: Separate Login Page Route Not Protected Against Owner Login

**What goes wrong:** A separate `/staff/login` page for cashiers/admins does not inherently prevent owners from using it. If an owner signs in via the staff login, they land on the cashier dashboard — a confusing dead end.

**Prevention:** After sign-in on the staff login page, check the user's role. If `role === 'owner'`, redirect to `/dashboard`. Add a helpful message: "Owner accounts use the main login."

**Phase:** Staff login page.

---

### Pitfall 12: `getServiceClient` Returns Service Role Client — Admin Auth Requires a Different Call Pattern

**What goes wrong:** The current `getServiceClient(event)` returns a typed Supabase client for database operations. Admin auth operations (`auth.admin.createUser`, `auth.admin.updateUserById`) are available on the same service role client, but the TypeScript types may not expose them unless the client is typed correctly.

**Why it happens:** `serverSupabaseServiceRole(event)` from `@nuxtjs/supabase` may or may not expose `auth.admin.*` methods depending on the version. Some implementations require instantiating the client manually with `createClient(url, serviceKey, { auth: { autoRefreshToken: false } })`.

**Prevention:** Verify that `serverSupabaseServiceRole(event).auth.admin.createUser` is callable and typed correctly before building out the staff creation endpoint. If not, add a dedicated `getAdminAuthClient` helper that explicitly constructs the client.

**Detection:** TypeScript error or runtime `auth.admin is undefined` when calling admin auth methods.

**Phase:** First implementation task — verify this works before building on top of it.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Staff create endpoint | Missing `email_confirm: true` | Enforce in code and add integration test |
| Staff create endpoint | Orphaned auth user on member insert failure | Compensating delete in catch block |
| Staff delete endpoint | Auth user not deleted alongside member row | Must call `auth.admin.deleteUser` — differentiate from invite model |
| Staff deactivation | `ban_duration` expiry / JWT still valid | Add `is_active` column, check in `requireMember()` |
| Password reset | Staff bypassing via client SDK | No self-service endpoint; admin-only via server |
| Staff creation form | Cashier + business scope crashes with DB error | Validate before DB; disable invalid scope in UI |
| Admin auth client | `auth.admin.*` not typed or available | Verify service role client exposes admin auth before building |
| Staff login page | Owner accidentally uses staff login | Role-based redirect after sign-in |

---

## Sources

- Supabase admin createUser — `email_confirm` requirement: [GitHub issue #29632](https://github.com/supabase/supabase/issues/29632), [Official JS reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- Supabase ban_duration behavior and limitations: [GitHub issue #1798](https://github.com/supabase/auth/issues/1798), [Community discussion #9239](https://github.com/orgs/supabase/discussions/9239)
- JWT not invalidated after deletion/deactivation: [Security discussion #36612](https://github.com/orgs/supabase/discussions/36612), [Supabase sessions docs](https://supabase.com/docs/guides/auth/sessions)
- Orphaned data on user deletion: [Supabase user management docs](https://supabase.com/docs/guides/auth/managing-user-data), [Troubleshooting errors](https://supabase.com/docs/guides/troubleshooting/dashboard-errors-when-managing-users-N1ls4A)
- Service role key server-side only: [serverSupabaseServiceRole docs](https://supabase.nuxtjs.org/services/serversupabaseservicerole)
- Codebase analysis: `server/utils/auth.ts`, `server/api/members/`, `supabase/migrations/001_initial_schema.sql`, `app/pages/dashboard/[businessSlug]/members.vue`
