# Feature Landscape: Staff Account Management

**Domain:** B2B loyalty platform — staff/employee account lifecycle management
**Researched:** 2026-03-20
**Context:** Subsequent milestone on Stampku (Nuxt 4 + Supabase). Existing codebase already has
role-based members table, permissions, and a members page. The gap: owners must currently paste
raw UUIDs to add staff — no way to create the auth account itself.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Owner creates staff account (email + password) | Core requirement — replaces current UUID-paste UX | Medium | Uses `supabase.auth.admin.createUser({ email, password, email_confirm: true })` server-side |
| Role assignment at creation | Cashier vs admin distinction is fundamental to the permission model | Low | Already modeled in `members.role` ENUM |
| Branch/scope assignment at creation | Cashier must be scoped to exactly one branch; admin can be business-wide | Low | Already modeled in `members.scope_type` / `scope_id` |
| View staff list with role/scope | Owner needs to see who has access and what they can do | Low | Existing members page already renders this — needs display enhancements |
| Owner resets staff password | Staff cannot do self-service reset; owner controls all credentials | Low | `auth.admin.updateUserById({ password })` server-side |
| Owner deactivates staff account | Suspend access without deleting (e.g., staff on leave, terminated but records preserved) | Low | `auth.admin.updateUserById({ ban_duration: '876000h' })` — effectively permanent ban |
| Owner reactivates staff account | Reverse of deactivation | Low | `auth.admin.updateUserById({ ban_duration: 'none' })` |
| Owner deletes staff account permanently | Remove access entirely when staff leaves | Low | `auth.admin.deleteUser(userId)` — cascades to `members` row via FK |
| Staff login page separate from customer/owner flow | Staff should not see customer-facing registration; reduces confusion | Low | New `/cashier/login` page or existing `/login` with role-based redirect |
| Owner can reassign staff to a different branch | Staff may transfer locations | Low | Update `members` row `scope_id` + optionally `scope_type` |
| Display staff name/email (not raw UUID) | Current members page shows `auth_user_id` (UUID) — completely unusable | Low | Requires joining `auth.users` email at list time via service role |
| Account status indicator (active/inactive) | Owner needs to know at a glance which accounts are deactivated | Low | Read `banned_until` from `auth.users` via service role |

---

## Differentiators

Features that set the product apart. Not expected, but valued if present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Show last login time per staff account | Quickly identify stale or unused accounts | Medium | `auth.users.last_sign_in_at` available via service role query |
| Staff account activity log (audit trail) | Owner can see which cashier processed which transactions | High | `transactions.performed_by` already captures `auth_user_id` — join to display |
| Copy-able temporary password display | After creation, show generated password once in a modal for owner to hand to staff | Low | UX convenience — store nothing, just display at creation time |
| Staff creation with auto-generated strong password | Remove burden of owner inventing passwords | Low | Generate on server, return plaintext once at creation |
| Inline branch filter on staff list | On businesses with many branches, filter the members list by branch | Low | Client-side filter, no new API |

---

## Anti-Features

Features to explicitly NOT build in this milestone. Each has a reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Staff self-service password reset | Contradicts the project's core security model — owner controls all credentials | Owner resets manually via dashboard |
| Staff self-registration / sign-up | Accounts are owner-created only — self-reg bypasses access control | N/A — owner creates all accounts |
| Email invitation links (magic links) | Adds email deliverability dependency, longer onboarding UX; project decision is direct creation | Create with password directly |
| Multi-branch assignment for single staff | Adds join complexity and ambiguity about which branch a transaction belongs to | One branch per cashier |
| Staff profile editing (name, avatar, etc.) | Not needed for this milestone; increases scope significantly | Defer entirely |
| Owner-role creation via this UI | The `members` table CHECK constraint and API already block this; owners are created via business setup flow | Existing constraint is sufficient |
| Two-factor authentication for staff | Overkill for POS cashier use case; adds friction at checkout | N/A for this audience |
| SSO / enterprise identity provider | Not applicable for small-business target market | N/A |
| Staff scheduling or shift management | HR scope beyond what Stampku does | Use dedicated HR software |
| Permissions editor / custom roles | Three roles (owner/admin/cashier) is sufficient; custom roles add complexity | Existing ENUM is sufficient |

---

## Feature Dependencies

```
auth account creation (admin API)
  → member row insertion (existing /api/members POST)
  → role/scope assignment (existing members schema)

display staff name/email
  → service role query on auth.users at list time
  → member list API must JOIN or enrich with auth user data

deactivate account
  → auth.admin.updateUserById (ban_duration)
  → account status indicator (read banned_until)
  → reactivation (ban_duration: 'none')

delete account
  → auth.admin.deleteUser
  → members row cascades automatically (FK ON DELETE CASCADE)

password reset
  → auth.admin.updateUserById (password field)
  → no dependency on other new features

separate staff login page
  → existing /login or new /cashier/login route
  → middleware role check redirects correctly after auth
```

---

## MVP Recommendation

Prioritize these in order:

1. **Create staff account (email + password + role + scope)** — fills the core gap; replaces UUID-paste UX
2. **Enrich staff list with email and status** — without this, the list is still unusable UUIDs
3. **Reset password** — owner needs credential control from day one
4. **Deactivate / reactivate account** — soft delete is safer than hard delete for operations
5. **Delete account permanently** — needed for clean offboarding
6. **Separate staff login page** — UX polish, but scoped to a new route and redirect logic

Defer (not this milestone):
- Last login time display — valuable but not blocking
- Audit trail / activity log — already partially captured in `transactions.performed_by`; reporting is a separate milestone
- Auto-generated passwords / copy-once display — nice-to-have UX, consider during implementation
- Inline branch filter — add only if branch count warrants it

---

## Implementation Notes (Supabase-Specific)

These are verified findings that constrain how features must be implemented.

### Creating accounts (HIGH confidence)
`supabase.auth.admin.createUser({ email, password, email_confirm: true })` creates a verified,
immediately usable account server-side. Requires service role key. Must be called from
`server/api/` (never from the PWA directly — architecture rule).

### Deactivating accounts (MEDIUM confidence)
`auth.admin.updateUserById(uid, { ban_duration: '876000h' })` sets `banned_until` ~100 years out,
effectively permanently disabled. `ban_duration: 'none'` re-enables. Known issue: setting
`ban_duration` during `createUser` does not persist — must be a separate `updateUserById` call.
Source: github.com/supabase/auth/issues/1798

### Deleting accounts (HIGH confidence)
`auth.admin.deleteUser(uid)` hard-deletes the auth user. The `members` table FK to `auth.users`
has `ON DELETE CASCADE`, so the member row is automatically removed. No orphan cleanup needed.

### Enriching staff list with email (HIGH confidence)
The service client (`serverSupabaseServiceRole`) can query `auth.users` directly (via
`supabase.auth.admin.listUsers()` or by selecting from `auth.users` with service role).
The members list API must be updated to join/enrich with email and `banned_until` status from
`auth.users`.

---

## Sources

- Supabase JS Admin API — auth.admin.createUser: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase JS Admin API — auth.admin.updateUserById: https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- Supabase ban_duration persistence bug: https://github.com/supabase/auth/issues/1798
- Supabase disable user discussion: https://github.com/orgs/supabase/discussions/9239
- Existing codebase: `supabase/migrations/001_initial_schema.sql`, `server/api/members/`, `app/pages/dashboard/[businessSlug]/members.vue`
- PROJECT.md: `.planning/PROJECT.md`
