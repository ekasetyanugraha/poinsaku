---
phase: 01-foundation
plan: 01
subsystem: database, server-utils
tags: [migration, typescript-types, auth, supabase-admin]
dependency_graph:
  requires: []
  provides: [members.is_active, members.display_name, requireMember.active-check, createAuthUser]
  affects: [server/utils/auth.ts, server/utils/supabase.ts, server/utils/validators.ts, app/types/database.types.ts]
tech_stack:
  added: []
  patterns: [supabase-admin-createUser, is_active-guard, indonesian-error-messages]
key_files:
  created:
    - supabase/migrations/002_staff_columns.sql
  modified:
    - app/types/database.types.ts
    - server/utils/validators.ts
    - server/utils/auth.ts
    - server/utils/supabase.ts
decisions:
  - "is_active check placed after member-not-found and before role check: auth -> exists -> active -> role"
  - "No index on is_active: low cardinality, queries already filter by auth_user_id/scope_id (indexed)"
  - "email_confirm: true in createAuthUser: owner creates accounts directly, no email verification needed"
  - "Duplicate email detection uses message.toLowerCase().includes('already') OR status === 422 for resilience"
metrics:
  duration: 2m
  completed: 2026-03-20
  tasks_completed: 3
  files_modified: 5
---

# Phase 01 Plan 01: Staff Account Infrastructure Summary

**One-liner:** Added is_active/display_name columns to members table, active-member guard to requireMember (HTTP 403 + Indonesian message), and createAuthUser admin utility wrapping auth.admin.createUser.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Database migration and TypeScript types for staff columns | 69a3b6d | supabase/migrations/002_staff_columns.sql, app/types/database.types.ts, server/utils/validators.ts |
| 2 | Update requireMember to reject inactive members | 0d465d6 | server/utils/auth.ts |
| 3 | Create createAuthUser utility | ef9d111 | server/utils/supabase.ts |

## What Was Built

### Migration (002_staff_columns.sql)
Two ALTER TABLE statements add `is_active BOOLEAN NOT NULL DEFAULT true` and `display_name TEXT` to the members table. No index on `is_active` — queries filter by `auth_user_id` and `scope_id` which are already indexed; the column has low cardinality.

### TypeScript Types (database.types.ts)
The `members` table type in `public.Tables` now includes `is_active: boolean` and `display_name: string | null` in Row, and `is_active?: boolean` / `display_name?: string | null` in Insert and Update shapes.

### Zod Validator (validators.ts)
`memberSchema` extended with `is_active: z.boolean().default(true)` and `display_name: z.string().max(100).nullable().optional()`.

### requireMember Active-Check (auth.ts)
- `MemberAccess` interface gains `isActive: boolean` and `displayName: string | null`
- Both SELECT queries now include `is_active, display_name` columns
- Active-member check added after member-not-found check and before role check:
  - Order: auth check -> exists check -> is_active check -> role check
  - Throws HTTP 403 with "Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis." when is_active is false
- Return object includes `isActive` and `displayName` fields

### createAuthUser Utility (supabase.ts)
New exported async function accepting `event`, `email`, `password`, and optional `user_metadata` (display_name, role). Calls `client.auth.admin.createUser` with `email_confirm: true`. Error handling:
- Duplicate email (message contains "already" OR status 422) → HTTP 409 "Email sudah terdaftar. Gunakan email lain."
- All other errors → HTTP 500 "Gagal membuat akun staf. Coba lagi."
- Returns created `User` object on success

## Decisions Made

1. **is_active check ordering:** After member-not-found, before role check. This ensures a deactivated member gets the specific 403 message rather than a generic Forbidden, matching the UI-SPEC interaction contract.
2. **No index on is_active:** Column has boolean cardinality; member queries always filter first by `auth_user_id` and `scope_id` which are uniquely indexed.
3. **email_confirm: true:** Owner creates staff accounts directly — no email verification loop needed.
4. **Duplicate email detection resilience:** Checks both `error.message.includes('already')` and `error.status === 422` to handle Supabase API variations.

## Deviations from Plan

None — plan executed exactly as written.

## Pre-existing Type Errors (Out of Scope)

The following type errors existed before this plan and are unrelated to the files modified here. Logged for awareness, not fixed:

- `app/components/ProgramQrModal.vue:46` — `navigator` property does not exist
- `app/composables/useMember.ts:9` — `data` property on `any[]`
- `app/pages/dashboard/[businessSlug]/transactions.vue:82` — type string not assignable to color union
- `server/api/dashboard/stats.get.ts:14` — `string | null` not assignable to `string | undefined`

## Self-Check: PASSED

Files verified:
- FOUND: supabase/migrations/002_staff_columns.sql
- FOUND: app/types/database.types.ts (members Row contains is_active: boolean)
- FOUND: server/utils/validators.ts (memberSchema contains is_active)
- FOUND: server/utils/auth.ts (is_active check, dinonaktifkan message, isActive return)
- FOUND: server/utils/supabase.ts (createAuthUser, auth.admin.createUser, email_confirm: true)

Commits verified:
- FOUND: 69a3b6d feat(01-01): add is_active and display_name to members table
- FOUND: 0d465d6 feat(01-01): update requireMember to reject inactive members
- FOUND: ef9d111 feat(01-01): add createAuthUser utility wrapping auth.admin.createUser
