---
phase: 03-client-layer
plan: 01
subsystem: server-api + composables
tags: [api, staff, auth-enrichment, composable, date-fns, vitest]
dependency_graph:
  requires:
    - server/utils/auth.ts (requireUser, requireOwner)
    - server/utils/supabase.ts (getServiceClient)
    - server/utils/business.ts (getBusinessIdFromQuery)
    - app/composables/useBusiness.ts (activeBusinessId)
  provides:
    - server/api/staff/index.get.ts (GET /api/staff with auth enrichment)
    - server/api/staff/me.get.ts (GET /api/staff/me with businessSlug)
    - app/composables/useStaff.ts (useStaff + relativeTime)
    - tests/unit/staff-display.test.ts (3 relativeTime unit tests)
  affects:
    - Plan 02 (members page consumes useStaff for staff list display)
    - Plan 03 (staff login consumes GET /api/staff/me for post-login routing)
tech_stack:
  added:
    - date-fns (formatDistanceToNow with Indonesian locale for relativeTime)
  patterns:
    - Nitro auto-imports in server/api files (no explicit import statements)
    - useFetch + computed query + watch pattern for reactive composables
    - auth.admin.listUsers for auth enrichment with Map-based O(1) lookups
key_files:
  created:
    - server/api/staff/index.get.ts
    - server/api/staff/me.get.ts
    - app/composables/useStaff.ts
    - tests/unit/staff-display.test.ts
  modified: []
decisions:
  - GET /api/staff requires owner role (not just member) since staff listing exposes email addresses from auth admin API
  - GET /api/staff/me uses maybeSingle() to find member by auth_user_id without requiring business_id as param
  - auth.admin.listUsers fetches page 1 with perPage=1000 (sufficient for current scale)
  - relativeTime exported at module level (not inside useStaff) for independent testability and template imports
  - resetPassword does NOT call refresh() — password change does not affect list display data
metrics:
  duration: 2 minutes
  completed_date: "2026-03-20T08:52:26Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 03 Plan 01: Data Layer for Staff Display Summary

**One-liner:** GET /api/staff enriches member rows with email + last_sign_in_at from auth admin API; GET /api/staff/me resolves businessSlug for post-login routing; useStaff composable wraps all 6 staff operations with date-fns Indonesian locale relativeTime helper.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create GET /api/staff and GET /api/staff/me endpoints + unit tests | 56df62c | server/api/staff/index.get.ts, server/api/staff/me.get.ts, tests/unit/staff-display.test.ts |
| 2 | Create useStaff composable wrapping all staff API endpoints | 9afd92e | app/composables/useStaff.ts |

## What Was Built

### GET /api/staff (server/api/staff/index.get.ts)
- Requires owner role via `requireOwner(event, businessId)`
- Fetches branch IDs and builds OR filter (same pattern as members/index.get.ts)
- Selects specific columns: `id, auth_user_id, role, scope_type, scope_id, is_active, display_name, invited_by, created_at`
- Calls `auth.admin.listUsers({ page: 1, perPage: 1000 })` to get all auth users
- Builds `Map<userId, authUser>` for O(1) lookups when merging
- Returns `{ data: enrichedMembers }` with `email` and `last_sign_in_at` merged per member
- Uses Nitro auto-imports exclusively (no explicit import statements)

### GET /api/staff/me (server/api/staff/me.get.ts)
- Requires only authentication via `requireUser(event)` (no business_id needed)
- Queries members table by `auth_user_id` using `maybeSingle()`
- Returns 404 if no member record found
- Returns 403 with Indonesian message if `is_active === false`
- Resolves `businessSlug` by looking up businesses or branches table depending on `scope_type`
- Returns `{ ...member, businessSlug }` for post-login routing

### app/composables/useStaff.ts
- `relativeTime(isoString)`: exported at module level, returns 'Belum pernah login' for null, Indonesian relative time via `formatDistanceToNow` with `date-fns/locale/id` otherwise
- `useStaff()`: follows useMember.ts pattern exactly
  - `useFetch('/api/staff', { query: computed(() => ({ business_id })), watch: [activeBusinessId] })`
  - `createStaff()`: POST with refresh
  - `resetPassword()`: PUT only (no refresh — password change doesn't affect list)
  - `toggleStatus()`: PUT with refresh
  - `reassignBranch()`: PUT with refresh
  - `deleteStaff()`: DELETE with refresh

### tests/unit/staff-display.test.ts
- 3 unit tests for `relativeTime` helper
- Test 1: null input returns 'Belum pernah login'
- Test 2: 1-hour-old timestamp returns string containing 'lalu'
- Test 3: 30-second-old timestamp returns string containing 'lalu'

## Verification Results

- `npx vitest run tests/unit/`: 2 test files, 24 tests passed (21 existing + 3 new)
- `requireOwner` present in index.get.ts
- `auth.admin.listUsers` present in index.get.ts
- `businessSlug` present in me.get.ts
- Both exports (`useStaff`, `relativeTime`) confirmed in useStaff.ts

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- server/api/staff/index.get.ts: FOUND
- server/api/staff/me.get.ts: FOUND
- app/composables/useStaff.ts: FOUND
- tests/unit/staff-display.test.ts: FOUND

Commits exist:
- 56df62c: FOUND
- 9afd92e: FOUND
