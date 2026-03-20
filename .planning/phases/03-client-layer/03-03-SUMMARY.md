---
phase: 03-client-layer
plan: 03
subsystem: auth
tags: [vue, nuxt, supabase, login, routing, middleware]

requires:
  - phase: 03-01
    provides: /api/staff/me endpoint returning role and businessSlug

provides:
  - Staff login page at /staff/login with minimal POS design
  - Role-based post-login redirect (cashier to /cashier, admin/owner to /dashboard/[slug])
  - Deactivated staff error detection via banned error code and 403 from /api/staff/me
  - Updated auth middleware routing cashier routes to /staff/login, dashboard to /login
  - /staff/login excluded from Supabase redirect module

affects:
  - cashier-ui (needs /cashier route to exist)
  - auth-flow (middleware routing now distinguishes cashier vs dashboard paths)

tech-stack:
  added: []
  patterns:
    - "useSupabaseClient() for auth sign-in (client-side auth exception to API-only rule)"
    - "$fetch('/api/staff/me') after signInWithPassword to determine role-based redirect"
    - "definePageMeta({ layout: false }) on standalone auth pages"
    - "Deactivated user detection: check error.message for 'banned' AND error.code === 'user_banned'"

key-files:
  created:
    - app/pages/staff/login.vue
  modified:
    - nuxt.config.ts
    - app/middleware/auth.ts

key-decisions:
  - "AUTH-03 enforced by omission: no password change UI exists anywhere for staff roles"
  - "Cashier routes redirect to /staff/login, dashboard routes redirect to /login (split middleware)"
  - "Deactivated check in both auth error (banned code) and /api/staff/me 403 — handles race condition"
  - "/staff/login added to Supabase redirect exclude array to prevent redirect loop on auth module"

patterns-established:
  - "Minimal staff login: no glass, no gradient blur, no decorative orbs, no Daftar/Lupa password links"
  - "After Supabase signIn, always call /api/staff/me to get role+slug before routing"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

duration: 1min
completed: 2026-03-20
---

# Phase 03 Plan 03: Staff Login Page Summary

**Minimal POS-style staff login at /staff/login with role-based redirect (cashier->cashier, admin->dashboard/[slug]) and split auth middleware routing**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-20T08:56:01Z
- **Completed:** 2026-03-20T08:57:10Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments
- Staff login page at /staff/login: minimal card-only design, no decorative elements, no registration links
- Role-based post-login redirect: cashiers to /cashier, admins/owners to /dashboard/[businessSlug]
- Deactivated staff detection handles both Supabase banned error and /api/staff/me 403 response
- Auth middleware split: /cashier routes redirect to /staff/login, /dashboard to /login
- /staff/login excluded from Supabase redirect module to prevent auth loops

## Task Commits

Each task was committed atomically:

1. **Task 1: Create staff login page with role-based redirect and update auth config** - `b1c87ad` (feat)
2. **Task 2: Verify staff login page and auth routing** - pending human verification

## Files Created/Modified
- `app/pages/staff/login.vue` - Minimal staff login page, layout:false, role-based redirect via /api/staff/me
- `nuxt.config.ts` - Added /staff/login to supabase.redirectOptions.exclude array
- `app/middleware/auth.ts` - Split redirect: /cashier to /staff/login, /dashboard to /login

## Decisions Made
- AUTH-03 enforced by omission: no password change UI is built anywhere for staff roles — satisfied passively
- Deactivated detection checks both `error.message.includes('banned')` and `error.code === 'user_banned'` to handle Supabase API response variations
- /api/staff/me called after successful sign-in (not before) to resolve role and businessSlug for redirect — owners who accidentally use /staff/login are routed gracefully to /dashboard/[slug]
- No footer section on staff login (unlike owner login) — purely functional, no "Belum punya akun?" link

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Staff login page complete and committed
- Awaiting human verification (Task 2 checkpoint) before plan can be marked fully complete
- After verification approval, plan 03 is complete and phase 03-client-layer is fully done

---
*Phase: 03-client-layer*
*Completed: 2026-03-20*
