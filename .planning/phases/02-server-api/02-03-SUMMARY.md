---
phase: 02-server-api
plan: "03"
subsystem: api
tags: [nuxt, h3, supabase, staff-management, auth-admin]

requires:
  - phase: 02-server-api
    plan: "01"
    provides: [updateAuthUserPassword, banAuthUser, unbanAuthUser, resetPasswordSchema, updateStatusSchema, reassignBranchSchema, requireOwner]

provides:
  - PUT /api/staff/[id]/password — owner-only password reset via Supabase Auth admin API
  - PUT /api/staff/[id]/status — deactivate (ban 87600h + is_active=false) or reactivate (unban + is_active=true) with partial failure handling
  - PUT /api/staff/[id]/branch — branch/scope reassignment with same-business cross-validation

affects:
  - frontend staff management UI (future)
  - Phase 03 — any integration testing or PWA feature using staff endpoints

tech-stack:
  added: []
  patterns:
    - Standard staff endpoint skeleton (getRouterParam → readBody+safeParse → fetch member → resolve businessId → requireOwner → owner-role guard → execute operation)
    - Partial-failure handling pattern: if auth op succeeds but DB write fails, return success+warning rather than erroring (stronger protection already applied)
    - Cross-business guard pattern: validate new branch belongs to current business before update

key-files:
  created:
    - server/api/staff/[id]/password.put.ts
    - server/api/staff/[id]/status.put.ts
    - server/api/staff/[id]/branch.put.ts
  modified: []

key-decisions:
  - "Partial failure on status change returns success+warning (auth ban/unban is the stronger protection; DB state can be repaired by retry)"
  - "Branch reassignment validates new scope belongs to same business before updating — prevents cross-business scope assignment"
  - "businessId resolved from scope_type before any auth assertion — consistent pattern across all 3 endpoints"

patterns-established:
  - "Pattern 1: Resolve businessId before requireOwner — scope_type=business uses scope_id directly; scope_type=branch joins branches!left(business_id)"
  - "Pattern 2: Owner-role guard after requireOwner — prevents modifying owner accounts even if caller is also an owner"
  - "Pattern 3: Partial failure response — return { success: true, warning: '...' } when the auth-side operation succeeds but DB write fails"

requirements-completed: [MGMT-01, MGMT-02, MGMT-03, MGMT-05]

duration: 2min
completed: 2026-03-20
---

# Phase 2 Plan 3: Password Reset, Status Toggle, and Branch Reassignment Endpoints Summary

**Three staff management PUT endpoints (password reset, deactivate/reactivate with auth ban, branch scope reassignment) with owner-only access, owner-role target protection, and cross-business safety guards.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T07:14:05Z
- **Completed:** 2026-03-20T07:16:29Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- PUT /api/staff/[id]/password: Resets any non-owner staff member's Supabase Auth password via admin API, accessible only to business owners
- PUT /api/staff/[id]/status: Deactivates (ban 87600h + is_active=false) or reactivates (unban + is_active=true) with atomic auth-first ordering and partial-failure warning on DB write error
- PUT /api/staff/[id]/branch: Reassigns staff scope with validation that the new branch/business target belongs to the same business, preventing cross-business scope leakage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create password reset and status toggle endpoints** - `56ad827` (feat)
2. **Task 2: Create branch reassignment endpoint** - `e87e7a1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `server/api/staff/[id]/password.put.ts` - Password reset endpoint; validates body with resetPasswordSchema, calls updateAuthUserPassword, owner-only
- `server/api/staff/[id]/status.put.ts` - Status toggle endpoint; deactivate (banAuthUser + is_active=false) or reactivate (unbanAuthUser + is_active=true), partial-failure handling
- `server/api/staff/[id]/branch.put.ts` - Branch reassignment; validates target branch exists and belongs to same business, updates scope_type/scope_id on members row

## Decisions Made

- **Partial failure handling for status changes:** When auth ban/unban succeeds but DB write fails, return `{ success: true, warning: '...' }` rather than a 500 error. The auth-side operation provides the stronger immediate protection; DB state can be repaired by a retry. This avoids leaving the user with a misleading error when the critical part succeeded.
- **businessId resolution before requireOwner:** All three endpoints resolve the caller's business context from the target member's current scope (scope_type=business uses scope_id directly; scope_type=branch joins branches!left(business_id)) before calling requireOwner. Consistent pattern established.
- **Branch existence + same-business validation in branch.put.ts:** When reassigning to a branch scope, the endpoint queries branches to confirm the branch exists AND that its business_id matches the current business. Cross-business reassignment returns 400.

## Deviations from Plan

None - plan executed exactly as written. The `server/api/staff/[id]/` directory did not exist (plan 02-02 was not yet executed), so it was created as a natural part of creating the first file — not a deviation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three staff management mutation endpoints are complete
- Together with server/api/staff/index.post.ts (from plan 02-02), the staff CRUD API covers: create, password reset, deactivate/reactivate, and branch reassignment
- Ready for Phase 03 (PWA/frontend) — UI can call all staff management endpoints
- All 21 schema unit tests continue passing after these additions

---
*Phase: 02-server-api*
*Completed: 2026-03-20*
