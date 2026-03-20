# Project Research Summary

**Project:** Stampku — Staff Account Management Milestone
**Domain:** B2B loyalty platform — staff/employee account lifecycle management
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Stampku already has a working role-based member system (owner/admin/cashier) with full RBAC, RLS, and API patterns. This milestone is a targeted extension — not a new system. The core gap is that owners must currently paste raw Supabase UUIDs to add staff, because the codebase has no way to create auth accounts. The recommended approach is to layer three new capabilities onto the existing system: auth provisioning (via `supabase.auth.admin.*` server-side), account state management (an `is_active` column on `members`), and a rebuilt UI for the members page. No new frameworks, no new tables beyond two columns on `members`.

The build order is well-defined and has hard dependencies: the database migration must come first, then the server API layer, then the composable extensions, and finally the UI and the separate staff login page. The entire milestone ships with zero new npm packages — every capability needed already exists in the current stack (`@nuxtjs/supabase`, `@nuxt/ui`, `zod`, Nuxt server routes).

The dominant risk in this milestone is security and data integrity at the auth-to-database boundary. Supabase Auth and PostgreSQL do not share a transaction boundary, so orphaned auth users are possible if compensating logic is skipped. Additionally, the `ban_duration` mechanism for deactivation has known edge cases, and deactivated users retain valid JWTs for up to one hour. Both risks are fully mitigatable by: (1) implementing compensating deletion in the staff creation endpoint, and (2) adding an `is_active` check to `requireMember()` so every API request validates DB state — not just the JWT.

---

## Key Findings

### Recommended Stack

The milestone is entirely additive on the existing Nuxt 4 + Supabase stack. The key implementation lever is `supabase.auth.admin.*` — the Supabase Auth Admin API available via `serverSupabaseServiceRole(event)`, which is already wired into `server/utils/supabase.ts`. No service changes, no new libraries.

**Core technologies:**
- `supabase.auth.admin` (via `@nuxtjs/supabase ^2.0.4`): create, update, deactivate, and delete auth users server-side — the only correct mechanism for owner-managed accounts
- Nuxt server routes (`nuxt ^4.0.0`): new `/api/staff/` namespace for auth-aware endpoints; keeps service role key off the client
- `zod ^4.3.6`: three new validation schemas (`createStaffSchema`, `resetStaffPasswordSchema`, `setStaffStatusSchema`) following the existing validators pattern
- `@nuxt/ui ^4.5.1`: `UModal`, `UFormField`, `USelect`, `UBadge` — all needed components already shipped; no new UI library
- Supabase CLI `^2.82.0`: one migration file for two new columns on `members`

### Expected Features

**Must have (table stakes):**
- Owner creates staff account (email + password + role + scope) — replaces the current UUID-paste UX entirely
- Enrich staff list with email, display name, and active/inactive status — current UUID-only list is unusable in practice
- Owner resets staff password — owner controls all credentials; no self-service
- Deactivate / reactivate staff account — soft suspend without data loss
- Delete staff account permanently — full offboarding; must also delete the auth user
- Separate staff login page (`/staff/login`) — staff should not see owner registration; role-based redirect after sign-in

**Should have (differentiators):**
- Last login time per staff account — identifies stale accounts (uses `auth.users.last_sign_in_at` via service role)
- Copy-once temporary password display — UX convenience at creation time; no storage
- Inline branch filter on staff list — client-side filter, no new API

**Defer (v2+):**
- Staff activity audit trail — `transactions.performed_by` already captures the data; reporting is a separate milestone
- Auto-generated strong passwords — nice to have, can be added during implementation without scope increase
- Staff profile editing (name, avatar) — not blocking

### Architecture Approach

The system adds three layers to the existing codebase: a server-side auth provisioning API (`/api/staff/` namespace), a DB-level account state mirror (`is_active` on `members`), and an enhanced Members page UI. The existing `requireMember()` / `requireOwner()` authorization utilities, `useMember()` composable, and `members.vue` page are extended in place — no parallel structures. The key architectural constraint is that `supabase.auth.admin.*` is server-only, which the existing architecture already enforces (all data operations through `server/api/`).

**Major components:**
1. **Staff Provisioning API** (`POST /api/staff`) — creates auth user + inserts member row with compensating rollback; the only component that ever calls `auth.admin.createUser`
2. **Staff Password Reset API** (`PUT /api/staff/[id]/password`) — owner-only, server-side `auth.admin.updateUserById`; no self-service path exists
3. **Staff Status API** (`PUT /api/staff/[id]/status`) — toggles `ban_duration` on auth user + updates `is_active` on members row; dual write is intentional (Auth enforces, DB enables fast UI queries)
4. **Enhanced Member Delete** (`DELETE /api/members/[id]`) — existing endpoint extended to also call `auth.admin.deleteUser` for owner-managed accounts; owner role protected from deletion via this path
5. **Extended `useMember()` Composable** — adds `createStaff()`, `resetStaffPassword()`, `setStaffActive()` methods; uses existing `refresh()` pattern after mutations
6. **Enhanced Members Page UI** — replaces raw UUID invite form with email+password+role+scope creation form; adds status badges and action buttons per card
7. **Staff Login Page** (`/staff/login`) — same `signInWithPassword()` call as owner login; fetches `/api/members/me` post-auth to determine redirect (cashier → `/cashier`, admin → `/dashboard/[slug]`)

### Critical Pitfalls

1. **Missing `email_confirm: true` in `auth.admin.createUser`** — omitting this flag creates an unconfirmed account; staff cannot log in despite correct credentials. Always pass `email_confirm: true`. Test on day 1 of implementation.

2. **Orphaned auth user on member insert failure** — `auth.admin.createUser` and the `members` INSERT are not atomic. If the INSERT fails, an orphan auth user blocks the email permanently. Implement compensating `auth.admin.deleteUser` in the catch block — this is a day-1 requirement, not a later hardening step.

3. **Deleting a member row without deleting the auth user** — the existing DELETE endpoint only removes the `members` row. Staff auth users must also be explicitly deleted via `auth.admin.deleteUser`. Email addresses become permanently locked otherwise.

4. **Active JWT remains valid after deactivation/deletion** — banning a user in Supabase Auth does not invalidate existing JWT access tokens (up to 1 hour window). Mitigate with a DB-level `is_active` check in `requireMember()`: every API request validates against the database, not just the token.

5. **`ban_duration` expiry and edge cases** — `ban_duration` is time-based; there is no native "indefinitely banned" flag, and a known bug (`supabase/auth#1798`) can cause the value not to persist in some cases. The `is_active` DB column is the defense-in-depth that makes this safe.

---

## Implications for Roadmap

Based on the architecture's hard dependency chain, a three-phase structure maps cleanly to the build order.

### Phase 1: Foundation — Database Migration + Auth Infrastructure Verification

**Rationale:** Everything else depends on the `is_active` / `display_name` columns existing, and a known risk is that `serverSupabaseServiceRole(event).auth.admin.*` may not be typed or callable without explicit verification. Verify this works before building any business logic on top of it.

**Delivers:** The database foundation and confirmed API access pattern; unblocks all parallel work in Phase 2.

**Addresses:** `is_active` and `display_name` columns for features; auth client availability for all new endpoints.

**Avoids:** Pitfall 4 (ban_duration) and Pitfall 12 (service role client not exposing admin auth). Both must be resolved before anything else is built.

---

### Phase 2: Server API Layer — Staff Provisioning Endpoints

**Rationale:** The server API layer is the critical path. All UI and composable work depends on these endpoints. Steps 2–5 in the dependency chain (create, password reset, status, enhanced delete) can be built in parallel once Phase 1 is complete.

**Delivers:** Four working server endpoints with validation, authorization, and error handling. Staff accounts can be fully managed via API before any UI changes.

**Uses:** `supabase.auth.admin.*`, `zod` validation schemas, `requireOwner()` pattern, compensating transaction pattern.

**Implements:** Auth Provisioning API, Staff Password Reset API, Staff Status API, Enhanced Member Delete.

**Avoids:** Pitfall 1 (`email_confirm: true`), Pitfall 2 (compensating deletion), Pitfall 3 (auth user not deleted), Pitfall 6 (no self-service password endpoint created).

---

### Phase 3: Client Layer — Composable + UI + Staff Login Page

**Rationale:** UI and composable work can only proceed once the server endpoints are stable. The staff login page is independent of the members UI and can be built in parallel within this phase.

**Delivers:** Complete owner-facing staff management UI, updated member list with status badges, and a working staff authentication flow.

**Uses:** `useMember()` extension, `UModal`/`UBadge`/`USelect` components, Nuxt page routing.

**Implements:** Enhanced Members Page UI, Extended `useMember()` Composable, Staff Login Page.

**Avoids:** Pitfall 7 (UUID invite form not replaced), Pitfall 8 (cashier + business scope UI crash), Pitfall 9 (admin scope ambiguity without helper text), Pitfall 10 (deactivated members without visual indicator), Pitfall 11 (owner lands on staff login without redirect).

---

### Phase Ordering Rationale

- Phase 1 must be first: both the schema migration and the admin auth client verification are prerequisites with no workarounds.
- Phase 2 before Phase 3: the composable can only call endpoints that exist; the UI can only surface data the composable can fetch.
- Within Phase 2, all four endpoints can be built in parallel (they share the migration but are independent of each other).
- Within Phase 3, the staff login page (`/staff/login`) is independent of the members UI and can be parallelized.
- This is an unusually well-constrained scope: all research points to the same conclusion, and the existing codebase already handles authorization, RLS, and API patterns. The work is additive, not architectural.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (auth client verification):** The `serverSupabaseServiceRole(event).auth.admin.*` availability depends on `@nuxtjs/supabase` version specifics — verify before writing any endpoint code. If `auth.admin` is not exposed, a manual `createClient` wrapper is needed.

Phases with standard patterns (skip additional research):
- **Phase 2 (server endpoints):** All patterns are established and documented at HIGH confidence. The compensating transaction pattern is a known workaround with a clear implementation.
- **Phase 3 (UI/composable):** All components exist in `@nuxt/ui`; the composable extension follows the existing `refresh()` pattern exactly.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages already in use; `auth.admin.*` is official Supabase API with direct documentation |
| Features | HIGH | Derived directly from existing codebase gaps + official API capabilities; no speculation |
| Architecture | HIGH | Based on direct codebase analysis + verified Supabase Admin API docs; dependency order is definitive |
| Pitfalls | HIGH | Critical pitfalls corroborated across official docs, GitHub issues (#29632, #1798, #29590), and community discussions |

**Overall confidence:** HIGH

### Gaps to Address

- **`auth.admin` client availability:** `serverSupabaseServiceRole(event).auth.admin.*` must be verified to be typed and callable before Phase 2 begins. If the `@nuxtjs/supabase` module wraps the client in a way that hides auth admin methods, a `getAdminAuthClient` helper using `createClient(url, serviceKey)` directly will be needed. This is a 5-minute check at Phase 1 kickoff.

- **`is_managed_account` vs. extended delete logic:** PITFALLS.md flags that the enhanced DELETE endpoint must distinguish owner-created staff accounts from externally-invited members to decide whether to call `auth.admin.deleteUser`. The recommended approach is an owner-protection guard (`if member.role === 'owner' → 403`) rather than a separate boolean column — but this needs a final decision during Phase 2 planning.

- **`ban_duration` value alignment:** STACK.md uses `'87600h'` (10 years); FEATURES.md uses `'876000h'` (~100 years). Use `'87600h'` consistently — the 10-year value is sufficient for an effective permanent ban and avoids integer overflow concerns.

---

## Sources

### Primary (HIGH confidence)
- Supabase JS Auth Admin reference: https://supabase.com/docs/reference/javascript/admin-api
- Supabase `createUser` reference: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase `updateUserById` reference: https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- Supabase `deleteUser` reference: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- Supabase managing user data (app_metadata vs user_metadata): https://supabase.com/docs/guides/auth/managing-user-data
- serverSupabaseServiceRole docs: https://supabase.nuxtjs.org/services/serversupabaseservicerole
- Existing codebase: `server/utils/auth.ts`, `server/api/members/`, `app/composables/useMember.ts`, `supabase/migrations/001_initial_schema.sql`

### Secondary (MEDIUM confidence)
- Supabase user deactivation (ban_duration pattern): https://github.com/orgs/supabase/discussions/9239
- Supabase disable/deactivate user community discussion: https://github.com/orgs/supabase/discussions/36612

### Tertiary (issue reports, edge cases)
- `email_confirm` not auto-set bug: https://github.com/supabase/supabase/issues/29632
- `ban_duration` not persisting bug: https://github.com/supabase/auth/issues/1798
- `ban_duration` additional report: https://github.com/supabase/supabase/issues/29590

---

*Research completed: 2026-03-20*
*Ready for roadmap: yes*
