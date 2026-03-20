---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Phase 3 context gathered
last_updated: "2026-03-20T08:08:14.727Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** Business owners can create and fully control staff accounts (admins and cashiers) without staff having self-service access to credentials.
**Current focus:** Phase 02 — server-api

## Current Position

Phase: 02 (server-api) — EXECUTING
Plan: 3 of 3 (COMPLETE)

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Verify `serverSupabaseServiceRole(event).auth.admin.*` is typed and callable in `@nuxtjs/supabase ^2.0.4`. If not, a manual `createClient` wrapper using the service role key is needed before any Phase 2 endpoint can be written.
- Phase 2: Decide on delete guard for non-staff members — recommend owner-role check (`if member.role === 'owner' → 403`) rather than a separate `is_managed_account` column.
- Phase 2: Use `ban_duration: '87600h'` (10 years) consistently for deactivation — not `'876000h'`.

## Session Continuity

Last session: 2026-03-20T08:08:14.719Z
Stopped at: Phase 3 context gathered
Resume file: .planning/phases/03-client-layer/03-CONTEXT.md
