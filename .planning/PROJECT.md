# Stampku — Staff Account Management

## What This Is

A staff account management system for Stampku, a QR-based loyalty program platform. Business owners can create, manage, and control accounts for their admins and cashiers, assign them to specific branches, and maintain full control over credentials. This builds on top of the existing member/role system already in the codebase.

## Core Value

Business owners can create and fully control staff accounts (admins and cashiers) without staff having self-service access to credentials.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase. -->

- ✓ Member invitation system with role assignment (owner/admin/cashier) — existing
- ✓ Scope-based access control (business-wide or branch-level) — existing
- ✓ Role-based permission checks (canManageMembers, canManageSettings, etc.) — existing
- ✓ Member listing, updating, and removal via API — existing
- ✓ Members page in dashboard UI — existing
- ✓ Supabase Auth for authentication (email/password) — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Owner can create staff accounts directly (email + password)
- [ ] Staff accounts use a separate login page
- [ ] Staff cannot change their own passwords
- [ ] Owner can reset a staff member's password
- [ ] Owner can deactivate a staff account (disable login without deleting)
- [ ] Owner can delete a staff account permanently
- [ ] Owner can assign staff to a branch/business during account creation
- [ ] Owner can reassign staff to a different branch after creation
- [ ] One staff member belongs to exactly one branch (or business-wide)
- [ ] Staff management UI integrated into existing members page

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Self-service password reset for staff — owner controls all credentials
- Staff self-registration — accounts are owner-created only
- Multi-branch assignment for single staff — one branch per staff member
- Email invitation links — owner creates accounts directly with full credentials
- Staff profile editing — not needed for this milestone

## Context

- Stampku already has a working loyalty platform with businesses, branches, programs, stamps, cashback, vouchers, and transactions
- The existing `members` table and API support role (owner/admin/cashier) and scope (business/branch) assignment
- Current `inviteMember()` requires an existing `auth_user_id` — the gap is creating the auth account itself
- Supabase Admin API (`supabase.auth.admin`) can create users server-side with predetermined passwords
- The app uses Nuxt 4 with server API routes, Vue 3 composables, and Tailwind CSS / shadcn-nuxt for UI
- Architecture rule: PWA never calls Supabase directly for data operations — all through server API endpoints

## Constraints

- **Tech stack**: Must use existing Nuxt 4 + Supabase stack — no new frameworks
- **Auth**: Supabase Auth admin API for server-side user creation (service role key required)
- **Architecture**: All data operations through `server/api/` endpoints per project rules
- **Security**: Only owners (and business-scoped admins per existing permission model) can manage staff accounts

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Owner creates full accounts (no invite links) | Owner wants full control over staff credentials | — Pending |
| Staff cannot change their own passwords | Business security — owner controls all access | — Pending |
| Separate login page for staff | Clean separation of staff vs customer/owner auth flows | — Pending |
| One branch per staff member | Simplicity — avoid complex multi-assignment logic | — Pending |
| Enhance existing members page (not new section) | Consistent with current navigation, less UI surface area | — Pending |

---
*Last updated: 2026-03-20 after initialization*
