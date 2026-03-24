---
phase: quick
plan: 260324-gat
subsystem: rbac
tags: [superadmin, rbac, auth, permissions, migration]
dependency_graph:
  requires: []
  provides: [superadmin-role]
  affects: [server/utils/auth.ts, app/composables/usePermission.ts, app/middleware/role.ts]
tech_stack:
  added: []
  patterns: [superadmin-bypass-pattern, cross-business-access]
key_files:
  created:
    - supabase/migrations/004_superadmin_role.sql
  modified:
    - server/utils/auth.ts
    - server/utils/validators.ts
    - app/composables/usePermission.ts
    - app/middleware/role.ts
    - app/types/database.types.ts
decisions:
  - superadmin member lookup queries by role='superadmin' (not scoped to any business) for true cross-business access
  - superadmin passes requireMember checks that include 'owner' or 'superadmin' in opts.roles; falls through for cashier-only checks
  - no changes to createStaffSchema — superadmin creation is manual DB only by design
metrics:
  duration: 10m
  completed_date: "2026-03-24"
  tasks: 2
  files_modified: 5
  files_created: 1
---

# Phase quick Plan 260324-gat: Superadmin Role Summary

**One-liner:** Platform-level superadmin RBAC role with cross-business server bypass and full client-side permissions, creatable only via direct DB manipulation.

## What Was Built

Added a `superadmin` role to the RBAC system that:

1. **DB layer** (`004_superadmin_role.sql`): Extends the `member_role` PostgreSQL enum and updates the CHECK constraint to allow `(role = 'superadmin' AND scope_type = 'business')`.

2. **Server auth bypass** (`server/utils/auth.ts`): `requireMember` now queries for a superadmin record before the business-scoped lookup. If found and active, superadmin gets access to any `businessId` passed in. The superadmin passes role checks that require 'owner' or 'superadmin', but falls through to normal member lookup for cashier-specific checks.

3. **Validator** (`server/utils/validators.ts`): `memberSchema.role` enum includes 'superadmin'. `createStaffSchema` is unchanged — superadmin can only be assigned via direct DB row insertion.

4. **Client permissions** (`app/composables/usePermission.ts`): Added `isSuperAdmin` computed. All permission flags (`canDelete`, `canManageMembers`, `canManageSettings`, `canManagePrograms`) now return true for superadmin.

5. **Route guard** (`app/middleware/role.ts`): `/members` and `/settings` routes now allow `role === 'superadmin'` in addition to owner and business-scoped admin.

6. **Type definitions** (`app/types/database.types.ts`): `member_role` enum updated in both the type union and the runtime array.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration and server-side superadmin support | 6055807 | 004_superadmin_role.sql, auth.ts, validators.ts |
| 2 | Client-side permission and middleware updates | efff100 | database.types.ts, usePermission.ts, role.ts |

## Deviations from Plan

None — plan executed exactly as written.

The `server/api/staff/me.get.ts` required no changes as stated in the plan: superadmin uses `scope_type='business'` so the existing business slug resolution path (`if (member.scope_type === 'business')`) handles it correctly.

The `app/middleware/auth.ts` required no changes: the cashier redirect check (`if (role.value === 'cashier')`) naturally excludes superadmin.

## Verification

- `grep -r "superadmin"` confirms presence in all 6 expected files
- `createStaffSchema.role` remains `z.enum(['admin', 'cashier'])` — no superadmin creation via API
- TypeScript typecheck passes for all modified files (pre-existing errors in unrelated files are out of scope)

## Self-Check: PASSED

Files created:
- FOUND: supabase/migrations/004_superadmin_role.sql

Commits:
- FOUND: 6055807 (Task 1)
- FOUND: efff100 (Task 2)
