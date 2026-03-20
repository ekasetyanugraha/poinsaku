# Roadmap: PoinSaku — Staff Account Management

## Overview

Three phases that layer new capability onto the existing member system. Phase 1 lays the database and auth infrastructure that everything else depends on. Phase 2 builds the server API layer — the complete back-end for staff provisioning, password management, status control, and deletion. Phase 3 delivers the owner-facing UI and the staff login flow that make all of it usable. Each phase is independently verifiable before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Database migration and auth infrastructure verification
- [ ] **Phase 2: Server API** - Staff provisioning, password reset, status, and delete endpoints
- [ ] **Phase 3: Client Layer** - Members UI, composable extensions, and staff login page

## Phase Details

### Phase 1: Foundation
**Goal**: The database schema supports staff account state and display, and the service role auth admin client is confirmed callable from server routes
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure — enables all 16 v1 requirements)
**Success Criteria** (what must be TRUE):
  1. The `members` table has `is_active` (boolean, default true) and `display_name` (text, nullable) columns present in the Supabase schema
  2. A server route calling `serverSupabaseServiceRole(event).auth.admin.createUser(...)` executes without a type error or runtime exception
  3. The `requireMember()` utility rejects requests from members where `is_active = false` at the DB level (not just JWT level)
**Plans**: TBD

### Phase 2: Server API
**Goal**: Owners can fully manage staff accounts (create, reset password, deactivate, reactivate, delete, reassign) entirely through server API endpoints with no client-side Supabase calls
**Depends on**: Phase 1
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04, MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05
**Success Criteria** (what must be TRUE):
  1. A POST to `/api/staff` with email, password, display name, role, and scope creates both a Supabase Auth user and a `members` row; if the members insert fails, the auth user is deleted (no orphans)
  2. A PUT to `/api/staff/[id]/password` as owner updates the staff member's Supabase Auth password; staff themselves receive a 403 when attempting the same call
  3. A PUT to `/api/staff/[id]/status` as owner toggles `ban_duration` on the auth user and flips `is_active` on the members row; subsequent API calls from a deactivated staff member return 403 immediately (not waiting for JWT expiry)
  4. A DELETE to `/api/staff/[id]` as owner removes both the `members` row and the Supabase Auth user; the email address is immediately re-usable
  5. A PUT to `/api/members/[id]` as owner can update the `branch_id` or scope for a staff member (reassignment)
**Plans**: TBD

### Phase 3: Client Layer
**Goal**: Owners see a fully functional staff management UI with readable member details and status controls, and staff log in through a dedicated page with correct role-based routing
**Depends on**: Phase 2
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. The members list shows each staff member's email, display name, role, branch scope, and active/inactive badge — no raw UUIDs visible
  2. The members list shows the last login time for each staff member
  3. An owner can create a new staff account through a form on the members page (email, password, display name, role, branch) without leaving the page
  4. An owner can deactivate, reactivate, reset password, reassign branch, or delete a staff member from the members page using per-row action controls
  5. Staff navigate to `/staff/login` to sign in; after authentication, cashiers land on `/cashier` and admins land on `/dashboard/[slug]`; staff have no access to a password change UI
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Server API | 0/? | Not started | - |
| 3. Client Layer | 0/? | Not started | - |
