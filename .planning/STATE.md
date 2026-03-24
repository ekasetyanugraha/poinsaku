---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-03-21T01:49:00Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 9
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** Business owners can create and fully control staff accounts (admins and cashiers) without staff having self-service access to credentials.
**Current focus:** Phase 04 — cashier-mode-add-stamp-manually

## Current Position

Phase: 04 (cashier-mode-add-stamp-manually) — EXECUTING
Plan: 2 of 2

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 2 | 3 tasks | 5 files |
| Phase 02-server-api P01 | 3m | 3 tasks | 5 files |
| Phase 02-server-api P03 | 2m | 2 tasks | 3 files |
| Phase 02-server-api P02 | 3 | 2 tasks | 2 files |
| Phase 03-client-layer P01 | 2 | 2 tasks | 4 files |
| Phase 03 P03 | 1min | 1 tasks | 3 files |
| Phase 03 P02 | 3 | 1 tasks | 1 files |
| Phase 04 P01 | 7min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Pre-roadmap: Owner creates full accounts (no invite links) — owner wants full credential control
- Pre-roadmap: Staff cannot change their own passwords — business security model
- Pre-roadmap: Separate login page for staff (`/staff/login`) — clean auth flow separation
- Pre-roadmap: One branch per staff member — simplicity constraint
- Pre-roadmap: Enhance existing members page (not new section) — consistent navigation
- [Phase 01-foundation]: is_active check placed after member-not-found and before role check (auth -> exists -> active -> role)
- [Phase 01-foundation]: No index on is_active: low cardinality, member queries filter by indexed auth_user_id/scope_id first
- [Phase 01-foundation]: email_confirm: true in createAuthUser — owner creates accounts directly, no email verification
- [Phase 02-server-api]: Used --legacy-peer-deps for vitest install due to pre-existing vue-router v5 vs @nuxt/ui peer conflict
- [Phase 02-server-api]: ban_duration: '87600h' for deactivation (10 years), 'none' for unban — per project-decided constants
- [Phase 02-server-api]: createStaffSchema role enum excludes 'owner' — only admin and cashier can be created through staff endpoints
- [Phase 02-server-api]: Partial failure on status change returns success+warning (auth ban/unban is the stronger protection; DB state can be repaired by retry)
- [Phase 02-server-api]: Branch reassignment validates new scope belongs to same business before updating — prevents cross-business scope assignment
- [Phase 02-server-api]: No explicit imports in server API files — Nitro auto-imports server/utils/* (confirmed via nitro-imports.d.ts)
- [Phase 02-server-api]: DELETE order: member row deleted before auth user so orphan auth user has no business access if auth delete fails
- [Phase 03-client-layer]: GET /api/staff requires owner role since listing staff exposes email addresses from auth admin API
- [Phase 03-client-layer]: relativeTime exported at module level (not inside useStaff) for independent testability and template imports
- [Phase 03]: AUTH-03 enforced by omission: no password change UI built for staff roles
- [Phase 03]: Split auth middleware: /cashier routes redirect to /staff/login, /dashboard routes to /login
- [Phase 03-client-layer]: scope_type starts as empty string in create form — owner must explicitly choose scope (no default, per CONTEXT locked decision)
- [Phase 03-client-layer]: Reactivate action skips confirmation modal — non-destructive, immediate toggle
- [Phase 04-cashier]: GET /api/customers/lookup derives businessId from session member record, not client query param — cashier route has no business slug in URL
- [Phase 04-cashier]: Response always returns programs array (not single object) — client auto-selects when length=1
- [Phase 04-cashier]: cashier_branch_id included in lookup response as fallback for branch-scoped cashiers
- [Phase 04-cashier]: stamp_config included per program in lookup response for amount_based preview without extra round-trip

### Roadmap Evolution

- Phase 4 added: Cashier mode add stamp manually

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Verify `serverSupabaseServiceRole(event).auth.admin.*` is typed and callable in `@nuxtjs/supabase ^2.0.4`. If not, a manual `createClient` wrapper using the service role key is needed before any Phase 2 endpoint can be written.
- Phase 2: Decide on delete guard for non-staff members — recommend owner-role check (`if member.role === 'owner' → 403`) rather than a separate `is_managed_account` column.
- Phase 2: Use `ban_duration: '87600h'` (10 years) consistently for deactivation — not `'876000h'`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260321-d2b | Prepare for deployment on Cloudflare | 2026-03-21 | fc25c95 | [260321-d2b-prepare-for-deployment-on-cloudflare](./quick/260321-d2b-prepare-for-deployment-on-cloudflare/) |
| 260321-f72 | Add a GitHub Action for deploying (w/ environment variables) | 2026-03-21 | 50e6234 | [260321-f72-add-a-github-action-for-deploying-w-envi](./quick/260321-f72-add-a-github-action-for-deploying-w-envi/) |
| 260324-f8v | Create wishlist feature with form, database, API, dedicated page, and feature toggle | 2026-03-24 | f64fd05 | [260324-f8v-create-wishlist-feature-with-form-databa](./quick/260324-f8v-create-wishlist-feature-with-form-databa/) |

## Session Continuity

Last activity: 2026-03-24 - Completed quick task 260324-f8v: Create wishlist feature with form, database, and feature toggle
Stopped at: Completed 04-01-PLAN.md
Resume file: .planning/phases/04-cashier-mode-add-stamp-manually/04-02-PLAN.md
