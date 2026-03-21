---
phase: 04-cashier-mode-add-stamp-manually
plan: 01
subsystem: api
tags: [zod, validators, supabase, phone-normalization, indonesia]

# Dependency graph
requires:
  - phase: 02-server-api
    provides: auth utils (requireUser, getServiceClient), validator patterns, Nitro auto-import convention
  - phase: 03-client-layer
    provides: cashier session patterns for business resolution
provides:
  - customerLookupSchema exported from server/utils/validators.ts (phone query validation)
  - calculateStampsFromAmount exported from server/utils/validators.ts (stamp preview pure function)
  - GET /api/customers/lookup endpoint for phone-based customer lookup
affects:
  - 04-02 (client will consume GET /api/customers/lookup and use calculateStampsFromAmount)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Session-derived businessId pattern (member -> scope_type/scope_id -> businessId, no client-supplied business param)
    - Phone normalization before DB lookup (normalizePhone called before .eq('phone', ...))
    - Programs array response always returned (even for single program) — client handles auto-select

key-files:
  created:
    - server/api/customers/lookup.get.ts
    - tests/unit/stamp-preview.test.ts
  modified:
    - server/utils/validators.ts
    - tests/unit/validators.test.ts

key-decisions:
  - "GET /api/customers/lookup derives businessId from session member record, not client query param — cashier route has no business slug in URL"
  - "Response returns programs array always (not single object) — client does auto-select when length=1"
  - "cashier_branch_id included in response as fallback for branch-scoped cashiers whose customer_program.branch_id may be null"
  - "stamp_config included per program so client can render amount_based preview without extra round-trip"

patterns-established:
  - "Session-derived businessId: query members by auth_user_id, then resolve scope_type/scope_id to businessId"
  - "No explicit imports in server API files — Nitro auto-imports server/utils/* (confirmed in Phase 02)"

requirements-completed: [CASH-01, CASH-02]

# Metrics
duration: 7min
completed: 2026-03-21
---

# Phase 04 Plan 01: Backend Infrastructure (Validators + Lookup Endpoint) Summary

**Phone-based customer lookup endpoint with Zod validation, phone normalization, session-derived businessId, and stamp preview calculation utility**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-21T01:42:40Z
- **Completed:** 2026-03-21T01:49:00Z
- **Tasks:** 2 (Task 1 used TDD: 3 commits)
- **Files modified:** 4

## Accomplishments

- Added `customerLookupSchema` and `calculateStampsFromAmount` to validators.ts with full unit test coverage
- Created GET /api/customers/lookup endpoint that authenticates, derives businessId from session, normalizes phone, and filters active stamp programs
- 40 total unit tests pass (7 new stamp preview + 9 new validator tests + 24 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `5cf766a` (test)
2. **Task 1 GREEN: Add customerLookupSchema + calculateStampsFromAmount** - `e7c91d6` (feat)
3. **Task 2: Create GET /api/customers/lookup endpoint** - `90acada` (feat)

_Note: TDD tasks have multiple commits (test RED → feat GREEN)_

## Files Created/Modified

- `server/utils/validators.ts` - Added `customerLookupSchema` (z.object with phoneSchema) and `calculateStampsFromAmount` pure function with division-by-zero guard
- `server/api/customers/lookup.get.ts` - New GET endpoint: auth + session businessId resolution + phone normalization + active stamp program filtering + stamp_config + cashier_branch_id
- `tests/unit/validators.test.ts` - Added normalizePhone (4 cases) and customerLookupSchema (5 cases) test blocks
- `tests/unit/stamp-preview.test.ts` - New test file with 7 cases for calculateStampsFromAmount

## Decisions Made

- Session-derived businessId: cashier's `/cashier` route has no business slug in URL, so businessId must come from the authenticated member's scope record — mirrors pattern from `server/api/staff/me.get.ts`
- Response shape always returns `programs` array (not a single object) — client can auto-select when `programs.length === 1` without API changes if multi-program support needed later
- `cashier_branch_id` in response: branch-scoped cashiers need their branchId as a fallback when creating stamp transactions, since `customer_program.branch_id` can be null for business-scoped programs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing typecheck errors in `app/components/ProgramQrModal.vue` and `app/composables/useMember.ts` found during typecheck run — out of scope, not touched. Unit tests (the actual verification target for this plan) all pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GET /api/customers/lookup endpoint ready for consumption by cashier page UI (Phase 04 Plan 02)
- `calculateStampsFromAmount` exported and tested, ready for client-side amount preview in manual stamp form
- Response shape compatible with existing `verifiedData` flow used in QR scan path

---
*Phase: 04-cashier-mode-add-stamp-manually*
*Completed: 2026-03-21*
