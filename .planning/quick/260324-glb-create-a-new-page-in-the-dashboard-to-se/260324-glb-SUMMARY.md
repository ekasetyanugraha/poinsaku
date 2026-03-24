---
phase: quick
plan: 260324-glb
subsystem: dashboard
tags: [superadmin, wishlist, dashboard, api, auth]
dependency_graph:
  requires: [260324-gat, 260324-f8v]
  provides: [GET /api/wishlist, /dashboard/wishlists page]
  affects: [server/utils/auth.ts, app/layouts/dashboard.vue, app/middleware/role.ts]
tech_stack:
  added: []
  patterns: [requireSuperAdmin auth guard, superadmin-gated sidebar section, route middleware guard]
key_files:
  created:
    - server/api/wishlist/index.get.ts
    - app/pages/dashboard/wishlists.vue
  modified:
    - server/utils/auth.ts
    - app/layouts/dashboard.vue
    - app/middleware/role.ts
decisions:
  - requireSuperAdmin checks members table for active superadmin record rather than reusing requireMember to avoid businessId requirement
  - wishlists page uses top-level await on useFetch so data is available during SSR
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 5
---

# Quick Task 260324-glb: Superadmin Wishlists Dashboard Summary

**One-liner:** Superadmin-only dashboard page at `/dashboard/wishlists` showing all wishlist_submissions via a protected GET /api/wishlist endpoint with sidebar nav and route guard.

## What Was Built

A complete superadmin-only feature:

1. **`requireSuperAdmin` auth helper** (`server/utils/auth.ts`) — verifies the requesting user has an active `role = 'superadmin'` member record, throws 403 otherwise.

2. **GET /api/wishlist endpoint** (`server/api/wishlist/index.get.ts`) — protected by `requireSuperAdmin`, queries all `wishlist_submissions` ordered newest-first, returns `{ data, total }`.

3. **Dashboard page** (`app/pages/dashboard/wishlists.vue`) — fetches via `useFetch('/api/wishlist')`, renders each submission in a `UCard` (glass-card pattern) with name, email, company, industry badge, message, and localized date. Includes loading spinner and empty state.

4. **Sidebar nav** (`app/layouts/dashboard.vue`) — added `isSuperAdmin` import from `usePermission()`, added a `v-if="isSuperAdmin"` section with "Super Admin" heading and Wishlists link using `i-lucide-clipboard-list`.

5. **Route middleware** (`app/middleware/role.ts`) — added guard that redirects non-superadmin users away from `/dashboard/wishlists` to `/dashboard/business`.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | Create requireSuperAdmin helper and GET /api/wishlist endpoint | 0b5dc45 |
| 2 | Create wishlists dashboard page with sidebar nav and route guard | e2b77e9 |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- GET endpoint file exists at `server/api/wishlist/index.get.ts` and uses `requireSuperAdmin`
- Page file exists at `app/pages/dashboard/wishlists.vue` with `useFetch('/api/wishlist')`
- Sidebar conditionally shows wishlists link only when `isSuperAdmin` is true (2 occurrences in dashboard.vue)
- Role middleware redirects non-superadmin users away from `/dashboard/wishlists`
- Typecheck: no new type errors introduced (pre-existing errors in unrelated files were not modified)

## Self-Check: PASSED

- `server/api/wishlist/index.get.ts` exists
- `app/pages/dashboard/wishlists.vue` exists
- `server/utils/auth.ts` contains `requireSuperAdmin` (1 match)
- `app/layouts/dashboard.vue` contains `isSuperAdmin` (2 matches)
- `app/middleware/role.ts` contains `wishlists` guard (1 match)
- Commits 0b5dc45 and e2b77e9 exist in git log
