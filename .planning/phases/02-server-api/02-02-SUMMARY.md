---
phase: 02-server-api
plan: 02
subsystem: api
tags: [nuxt, supabase, supabase-auth, h3, zod, staff-management]

# Dependency graph
requires:
  - phase: 02-server-api-01
    provides: "createAuthUser, deleteAuthUser, requireOwner, createStaffSchema — all utilities this plan depends on"

provides:
  - "POST /api/staff — creates Supabase Auth user + members row atomically with rollback on failure"
  - "DELETE /api/staff/[id] — removes members row then auth user with graceful partial failure handling"

affects: [02-server-api-03, 03-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nitro auto-imports for server utils — no explicit import statements in server API files"
    - "Atomic staff creation: createAuthUser then insert member, rollback auth on insert failure"
    - "Defensive delete order: member row first, auth user second (orphan auth harmless without member row)"

key-files:
  created:
    - server/api/staff/index.post.ts
    - server/api/staff/[id]/index.delete.ts
  modified: []

key-decisions:
  - "No explicit imports in server API files — Nuxt/Nitro auto-imports server/utils/* (confirmed via nitro-imports.d.ts)"
  - "DELETE order: member row deleted before auth user so orphan auth user has no business access if auth delete fails"
  - "Rollback uses .catch(() => {}) on deleteAuthUser so rollback failure does not shadow the original insert error"

patterns-established:
  - "Staff endpoint pattern: validate body → resolve business from scope → requireOwner → operation"
  - "Atomicity pattern: create auth user → insert DB row → rollback auth user on DB failure"
  - "Graceful partial failure: return { deleted: true, warning: '...' } when auth delete fails after member row removed"

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, ACCT-04, MGMT-04]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 02 Plan 02: Staff Creation and Deletion Endpoints Summary

**POST /api/staff and DELETE /api/staff/[id] with atomic create/rollback, owner-only access, and owner-role deletion guard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T07:14:05Z
- **Completed:** 2026-03-20T07:17:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- POST /api/staff creates Supabase Auth user then inserts members row atomically; rolls back auth user on member insert failure to prevent orphans
- DELETE /api/staff/[id] removes member row first, then auth user; returns success with warning if auth delete fails (orphan has no business access)
- Both endpoints require owner authentication via requireOwner and reject operations on owner-role members with 403

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /api/staff endpoint** - `37e51d9` (feat)
2. **Task 2: DELETE /api/staff/[id] endpoint** - `0b19555` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `server/api/staff/index.post.ts` - Staff creation: validates with createStaffSchema, resolves business scope, asserts owner, creates auth user, inserts member, rolls back on failure
- `server/api/staff/[id]/index.delete.ts` - Staff deletion: resolves business from member record, asserts owner, guards owner-role, deletes member then auth user with graceful partial failure

## Decisions Made

- Used Nitro auto-import pattern (no explicit imports) matching established convention in existing server API files — confirmed by checking nitro-imports.d.ts which shows all server/utils/* exports are auto-imported
- DELETE order is intentional: member row first ensures orphan auth user (if auth delete fails) cannot access any business data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed incorrect explicit imports using ~/server/utils/ path alias**

- **Found during:** Task 1 (POST endpoint creation)
- **Issue:** Initial implementation used `import { createStaffSchema } from '~/server/utils/validators'` etc. — the `~/*` alias maps to `app/*` in server tsconfig, so these paths do not resolve. Existing working server files use no imports at all (Nitro auto-imports).
- **Fix:** Removed all explicit import statements; relied on Nitro auto-imports (confirmed via nitro-imports.d.ts showing all server/utils exports are available globally in server context)
- **Files modified:** server/api/staff/index.post.ts
- **Verification:** `npx nuxi typecheck` produces no errors for staff/index.post.ts
- **Committed in:** 37e51d9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in import style)
**Impact on plan:** Necessary for TypeScript correctness. No scope change.

## Issues Encountered

Pre-existing typecheck errors exist in `server/api/staff/[id]/password.put.ts` (written in a prior session using the same incorrect `~/` import style). These are out of scope for this plan — the file was created before this plan's execution. Both files created in this plan use correct auto-import pattern and have zero typecheck errors.

## Next Phase Readiness

- POST /api/staff and DELETE /api/staff/[id] are complete and verified
- Remaining endpoints in Phase 02 Plan 03: GET /api/staff, PUT /api/staff/[id]/status, PUT /api/staff/[id]/branch
- The password.put.ts pre-existing import issue should be fixed in Plan 03 as a deviation (Rule 1) if that plan touches that file

---
*Phase: 02-server-api*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: server/api/staff/index.post.ts
- FOUND: server/api/staff/[id]/index.delete.ts
- FOUND: .planning/phases/02-server-api/02-02-SUMMARY.md
- FOUND commit: 37e51d9 (Task 1)
- FOUND commit: 0b19555 (Task 2)
