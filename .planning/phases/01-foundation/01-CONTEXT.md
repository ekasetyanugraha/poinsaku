# Phase 1: Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Database migration to add staff account columns (`is_active`, `display_name`) to the existing `members` table, and verification that the Supabase Auth admin client (`auth.admin.createUser()`) is callable from server routes. This phase delivers the infrastructure that Phase 2 (Server API) and Phase 3 (Client Layer) depend on.

</domain>

<decisions>
## Implementation Decisions

### Auth Admin Verification
- Create a reusable `createAuthUser()` utility in `server/utils/` that wraps `auth.admin.createUser()` with error handling
- Only `createUser` for now — other admin methods (deleteUser, updateUser, ban/unban) added in Phase 2 when endpoints need them
- The utility should accept email, password, and `user_metadata` (display_name, role) — denormalized copy in Supabase Auth for JWT claims or quick lookup
- `getServiceClient()` wrapper already exists in `server/utils/supabase.ts` — build on top of it

### Existing Data Handling
- `is_active`: Default `TRUE` for all existing and new rows — `BOOLEAN NOT NULL DEFAULT true`
- `display_name`: Default `NULL` for existing rows — `TEXT` nullable column. UI (Phase 3) will fall back to showing email from Supabase Auth when display_name is null
- Columns apply to ALL member rows uniformly (owners, admins, cashiers) — no role-based exceptions or CHECK constraints on is_active

### Migration Approach
- New migration file `002_staff_columns.sql` with ALTER TABLE statements — clean history showing what changed and when
- Manually update TypeScript types in `database.types.ts` alongside the migration — no Supabase CLI regeneration dependency
- Update Zod validators in `server/utils/validators.ts` to include `is_active` and `display_name` in the member schema — keeps validation in sync with DB

### Claude's Discretion
- Inactive member behavior: how `requireMember()` checks and rejects `is_active = false` (error message, check ordering relative to scope lookup)
- Whether to add an index on `is_active` column
- Error handling patterns in the `createAuthUser()` utility
- Exact structure of user_metadata payload passed to Supabase Auth

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/001_initial_schema.sql` — Current members table definition with role/scope CHECK constraints (lines 86-104)
- `app/types/database.types.ts` — TypeScript types for Supabase tables, must be updated to match new columns

### Server Utilities
- `server/utils/auth.ts` — `requireMember()` and `requireUser()` implementations; `requireMember()` needs `is_active` check added
- `server/utils/supabase.ts` — `getServiceClient()` wrapper; `createAuthUser()` utility builds on this
- `server/utils/validators.ts` — Zod schemas for member validation; needs `is_active` and `display_name` fields added

### Project Context
- `.planning/ROADMAP.md` — Phase 1 success criteria (3 items that must be TRUE)
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 1 has no direct req IDs but enables all 16
- `.planning/STATE.md` — Blockers/Concerns section has implementation notes on `ban_duration` format and delete guard approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getServiceClient(event)` in `server/utils/supabase.ts`: Already wraps `serverSupabaseServiceRole(event)` — `createAuthUser()` calls this
- `requireMember()` in `server/utils/auth.ts`: Full member lookup with business/branch scope resolution — add `is_active` check here
- `requireOwner()` in `server/utils/auth.ts`: Shorthand for owner role check — inherits `is_active` check from `requireMember()`

### Established Patterns
- Zod schemas in `server/utils/validators.ts` for request validation — new fields follow same pattern
- `createError()` with statusCode/message for server errors — `is_active` rejection uses this
- `MemberAccess` interface in `server/utils/auth.ts` — may need `isActive` and `displayName` fields

### Integration Points
- Members table CHECK constraint (role-scope integrity) — migration must not break this
- `members` SELECT queries throughout server routes — already select specific columns, may need updating if they use `is_active`
- `database.types.ts` — generated types used across server and client; manual update must match migration exactly

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-20*
