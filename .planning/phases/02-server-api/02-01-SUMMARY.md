---
phase: 02-server-api
plan: "01"
subsystem: server-utils
tags: [vitest, zod, auth-admin, validation, tdd]
dependency_graph:
  requires: []
  provides:
    - createStaffSchema
    - resetPasswordSchema
    - updateStatusSchema
    - reassignBranchSchema
    - deleteAuthUser
    - updateAuthUserPassword
    - banAuthUser
    - unbanAuthUser
  affects:
    - server/api/staff/index.post.ts (future)
    - server/api/staff/[id]/password.put.ts (future)
    - server/api/staff/[id]/status.put.ts (future)
    - server/api/staff/[id]/branch.put.ts (future)
    - server/api/staff/[id]/index.delete.ts (future)
tech_stack:
  added:
    - vitest@4.1.0
  patterns:
    - TDD (RED → GREEN) for Zod schema unit tests
    - Auth admin wrappers following createAuthUser pattern
key_files:
  created:
    - vitest.config.ts
    - tests/unit/validators.test.ts
  modified:
    - package.json
    - server/utils/validators.ts
    - server/utils/supabase.ts
decisions:
  - "Used --legacy-peer-deps for vitest install due to pre-existing vue-router v5 vs @nuxt/ui peer conflict"
  - "ban_duration: '87600h' for deactivation (10 years), 'none' for unban — per project-decided constants"
  - "createStaffSchema role enum excludes 'owner' — only admin and cashier can be created through staff endpoints"
metrics:
  duration: "3 minutes"
  completed: "2026-03-20"
  tasks: 3
  files: 5
---

# Phase 2 Plan 1: Vitest Setup, Staff Zod Schemas, and Auth Admin Wrappers Summary

**One-liner:** Vitest unit test infrastructure with 4 staff Zod schemas (TDD, 21 tests) and 4 Supabase auth admin wrapper functions following the createAuthUser pattern.

## What Was Built

### Task 1: Vitest Installation and Configuration

Installed vitest@4.1.0 as a dev dependency, created `vitest.config.ts` pointing to `tests/**/*.test.ts`, and added a `test` script to `package.json`. Required `--legacy-peer-deps` due to a pre-existing peer dependency conflict (vue-router v5 vs @nuxt/ui's peerOptional vue-router v4) unrelated to this plan.

### Task 2: Staff Zod Schemas (TDD)

Added 4 schemas to `server/utils/validators.ts` via TDD (RED then GREEN):

- **createStaffSchema** — email, password (complexity regex: min 8 chars, uppercase, lowercase, digit), optional display_name, role enum (admin|cashier only — owner excluded), scope_type enum (business|branch), scope_id UUID
- **resetPasswordSchema** — password with same complexity rules
- **updateStatusSchema** — action enum (deactivate|reactivate)
- **reassignBranchSchema** — scope_type enum, scope_id UUID

21 unit tests cover: valid inputs, missing required fields, password complexity failures, owner role rejection, unknown enum values, and non-UUID scope_id values. All existing schemas were left untouched.

### Task 3: Auth Admin Wrapper Functions

Appended 4 exported async functions to `server/utils/supabase.ts`, following the exact pattern of the existing `createAuthUser` function (getServiceClient + auth.admin call + createError on failure):

- **deleteAuthUser** — `auth.admin.deleteUser(authUserId)` — hard delete, email immediately re-usable
- **updateAuthUserPassword** — `auth.admin.updateUserById(uid, { password })` — server-side password reset
- **banAuthUser** — `auth.admin.updateUserById(uid, { ban_duration: '87600h' })` — 10-year ban for deactivation
- **unbanAuthUser** — `auth.admin.updateUserById(uid, { ban_duration: 'none' })` — documented unban value

## Commits

| Hash | Message |
|------|---------|
| 9f9ab65 | chore(02-01): install vitest and create config |
| bf56b2b | test(02-01): add failing tests for staff Zod schemas |
| a0fcbf7 | feat(02-01): implement staff Zod schemas |
| d31b42b | feat(02-01): add auth admin wrapper functions to supabase.ts |

## Verification Results

- `npx vitest run tests/unit/validators.test.ts` — 21/21 tests passed
- `grep -c "export async function" server/utils/supabase.ts` — 5 (createAuthUser + 4 new)
- `grep -c "export const.*Schema" server/utils/validators.ts` — 20 (existing + 4 new)
- banAuthUser contains `ban_duration: '87600h'` (not '876000h')
- unbanAuthUser contains `ban_duration: 'none'` (not '0s')

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install required --legacy-peer-deps flag**
- **Found during:** Task 1
- **Issue:** Pre-existing peer dependency conflict — vue-router@5.0.3 in project conflicts with @nuxt/ui's peerOptional vue-router@^4.5.0. `npm install -D vitest` failed with ERESOLVE.
- **Fix:** Used `npm install -D vitest --legacy-peer-deps` to bypass the pre-existing conflict. This is a project-wide pre-existing issue unrelated to vitest.
- **Files modified:** package.json, package-lock.json
- **Commit:** 9f9ab65

## Self-Check: PASSED

- [x] vitest.config.ts exists
- [x] tests/unit/validators.test.ts exists (199+ lines, 21 test cases)
- [x] server/utils/validators.ts contains createStaffSchema, resetPasswordSchema, updateStatusSchema, reassignBranchSchema
- [x] server/utils/supabase.ts contains deleteAuthUser, updateAuthUserPassword, banAuthUser, unbanAuthUser
- [x] All 4 task commits confirmed in git log (9f9ab65, bf56b2b, a0fcbf7, d31b42b)
