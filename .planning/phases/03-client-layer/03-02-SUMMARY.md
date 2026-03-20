---
phase: 03-client-layer
plan: 02
subsystem: ui
tags: [vue, nuxt-ui, composables, staff-management, slideover, modal, dropdown]

# Dependency graph
requires:
  - phase: 03-client-layer/03-01
    provides: useStaff() composable with createStaff, resetPassword, toggleStatus, reassignBranch, deleteStaff, and relativeTime() function

provides:
  - Complete staff management UI at app/pages/dashboard/[businessSlug]/members.vue
  - Staff list with enriched display (email, display name, role badge, status badge, scope badge, last login)
  - Staff creation via USlideover panel
  - Per-row action dropdown (reset password, reassign branch, deactivate, delete)
  - Confirmation UModal for all destructive actions (delete, deactivate)
  - UModal for password reset and branch reassignment

affects: [03-03, staff-login, members-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UDropdownMenu with nested item arrays for grouped actions with dividers
    - UModal for confirmation gates on destructive operations
    - USlideover for create-entity forms on dashboard pages
    - Dynamic badge color via helper function returning Nuxt UI color tokens
    - relativeTime() imported as named export at module level (not inside composable)

key-files:
  created: []
  modified:
    - app/pages/dashboard/[businessSlug]/members.vue

key-decisions:
  - "scope_type starts as empty string with no default — owner must explicitly choose scope (per CONTEXT locked decision)"
  - "Reactivate action skips confirmation modal — non-destructive, immediate toggle"
  - "Dynamic badge colors via roleBadgeColor() helper returning string tokens, not static attributes"

patterns-established:
  - "Pattern 1: Nested array structure in UDropdownMenu items creates visual dividers between action groups"
  - "Pattern 2: selectedStaff ref holds the target member for all action modals — single state pattern"
  - "Pattern 3: actionLoading shared across all action modals — only one action runs at a time"

requirements-completed: [DISP-01, DISP-02, DISP-03, DISP-04]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 03 Plan 02: Members Page Rewrite Summary

**Staff management UI with enriched list display, USlideover creation form, and per-row UDropdownMenu actions backed by UModal confirmation for all destructive operations**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T08:56:04Z
- **Completed:** 2026-03-20T08:58:42Z
- **Tasks:** 1 executed (1 complete, 1 at checkpoint awaiting human verification)
- **Files modified:** 1

## Accomplishments
- Complete rewrite of members.vue: replaced raw UUID list with enriched staff cards showing email/display name, role badge (Pemilik/Admin/Kasir), status badge (Aktif/Nonaktif), scope badge (branch name or Bisnis), and Indonesian relative last login time
- Staff creation via USlideover panel from right with email, password, display name, role (radio), scope type (select), and branch picker (conditional)
- Per-row action dropdown via UDropdownMenu with Reset Password, Pindah Cabang, Nonaktifkan/Aktifkan, and Hapus actions; destructive items colored error
- Four UModal confirmations: delete, deactivate, password reset, and branch reassignment
- Inactive staff rows dimmed with opacity-50 and transition-opacity; owner row has no action controls
- All 24 existing vitest tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite members.vue with staff list display and creation slideover** - `5574b0a` (feat)
2. **Task 2: Verify staff management UI** - awaiting human verification at checkpoint

**Plan metadata:** pending (after checkpoint)

## Files Created/Modified
- `app/pages/dashboard/[businessSlug]/members.vue` - Complete rewrite: 294 lines added replacing 75 lines of old invite-based UI

## Decisions Made
- scope_type starts as empty string `''` — no default, owner must explicitly choose (per CONTEXT locked decision)
- Reactivate (Aktifkan) does not require confirmation modal — it is a non-destructive recovery action
- Dynamic badge colors via `roleBadgeColor()` helper returning `'primary'` / `'warning'` / `'neutral'` strings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- members.vue complete and committed; awaiting human verification at checkpoint (Task 2)
- After checkpoint approval, Phase 03 Plan 02 is fully done
- Plan 03 (staff login page) can proceed immediately after approval

---
*Phase: 03-client-layer*
*Completed: 2026-03-20*
