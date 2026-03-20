# Phase 2: Server API - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete server API layer for staff account management. Owners can create staff accounts (admin/cashier), reset passwords, deactivate/reactivate, permanently delete, and reassign branches — all through dedicated `/api/staff/` endpoints. No client-side Supabase calls. This phase builds on the `createAuthUser()` utility and `requireMember()` active-check from Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Endpoint Structure
- New `/api/staff/` directory for all staff management endpoints — separate from existing `/api/members/`
- Endpoint map:
  - `POST /api/staff` — create staff account (auth user + member row)
  - `PUT /api/staff/[id]/password` — reset staff password
  - `PUT /api/staff/[id]/status` — deactivate/reactivate staff
  - `DELETE /api/staff/[id]` — permanently delete staff
  - `PUT /api/staff/[id]/branch` — reassign staff to different branch
- `[id]` refers to the members table primary key (not auth_user_id)
- Merge into `/api/staff/` only — existing `/api/members/` endpoints to be consolidated under `/api/staff/`

### Permission Scope
- Owner-only for all staff management operations (create, reset password, deactivate, reactivate, delete, reassign)
- Use `requireOwner(event, businessId)` for all staff endpoints
- Only admin and cashier roles can be created through staff endpoints — owners cannot be created as "staff"
- Owner members are protected — staff endpoints reject operations targeting owner-role members (prevents self-lockout)

### Staff Creation Contract
- All fields required: email, password, display_name (optional), role (admin | cashier), scope_type, scope_id
- Custom server-side password validation via Zod (minimum length + complexity rules beyond Supabase defaults)
- Response: minimal confirmation `{ id, email, created: true }` — client fetches full details separately
- Atomicity: if member insert fails after auth user creation, auto-rollback by deleting the auth user (no orphans)
- Uses `createAuthUser()` from Phase 1 for the Supabase Auth user creation step

### Delete & Cleanup
- Hard delete: remove both the members table row AND the Supabase Auth user
- Email becomes immediately re-usable after deletion (per roadmap success criteria)
- No confirmation body required — just `DELETE /api/staff/[id]` with owner auth
- If member row deletion succeeds but auth user deletion fails: return success with warning (orphan auth user is harmless — no member row = no business access)
- Owner-role members cannot be deleted through staff endpoint (delete guard)

### Deactivation Mechanics
- Deactivate: set `ban_duration: '87600h'` (10 years) on auth user AND flip `is_active = false` on members row
- Reactivate: unban auth user AND flip `is_active = true` on members row
- Both operations must update auth and DB together — partial state is handled gracefully

### Claude's Discretion
- Exact Zod schema definitions for each endpoint's request body
- Error handling patterns for partial failures (ban succeeded but DB update failed, etc.)
- Whether to add admin auth wrapper utilities (`deleteAuthUser`, `updateAuthUser`, `banUser`, `unbanUser`) in `server/utils/supabase.ts` or inline
- Password validation rules (minimum length, character requirements)
- Response shape details beyond the specified contract

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Infrastructure (foundation this builds on)
- `server/utils/supabase.ts` — `getServiceClient()` and `createAuthUser()` utility; Phase 2 adds deleteUser/updateUser/ban/unban wrappers here
- `server/utils/auth.ts` — `requireMember()`, `requireOwner()`, `MemberAccess` interface; Phase 2 endpoints use `requireOwner()` for all operations
- `server/utils/validators.ts` — Zod schemas; Phase 2 adds staff-specific schemas (CreateStaffSchema, etc.)
- `app/types/database.types.ts` — TypeScript types for members table (includes is_active, display_name from Phase 1)
- `supabase/migrations/002_staff_columns.sql` — is_active and display_name column definitions

### Existing Member Endpoints (being consolidated)
- `server/api/members/index.post.ts` — Current invite flow (requires auth_user_id); being replaced by POST /api/staff
- `server/api/members/[id].delete.ts` — Current delete (member row only, no auth cleanup); being replaced by DELETE /api/staff/[id]
- `server/api/members/[id].put.ts` — Current member update; reassign moves to PUT /api/staff/[id]/branch
- `server/api/members/index.get.ts` — Member listing; stays or moves to GET /api/staff

### Project Context
- `.planning/ROADMAP.md` — Phase 2 success criteria (5 items, exact endpoint contracts)
- `.planning/REQUIREMENTS.md` — ACCT-01 through ACCT-04, MGMT-01 through MGMT-05
- `.planning/STATE.md` — Blockers/Concerns: ban_duration format, delete guard approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createAuthUser(event, params)` in `server/utils/supabase.ts`: Already handles auth user creation with email_confirm and error messages — Phase 2 extends this pattern
- `getServiceClient(event)` in `server/utils/supabase.ts`: Service role client for all privileged DB and auth operations
- `requireOwner(event, businessId)` in `server/utils/auth.ts`: Shorthand for owner-only auth — all staff endpoints use this
- `memberSchema` in `server/utils/validators.ts`: Existing Zod schema — Phase 2 creates separate staff-specific schemas

### Established Patterns
- Event handler: `defineEventHandler(async (event) => { ... })` with Zod safeParse → auth check → DB operation → response
- Error shape: `createError({ statusCode, message })` with optional `data` for validation errors
- Business resolution: Resolve businessId from scope_type/scope_id (business direct or branch → business lookup)
- Service client for all DB operations: `const db = getServiceClient(event)`

### Integration Points
- `server/api/members/` — endpoints being consolidated into `/api/staff/`
- `server/utils/supabase.ts` — new admin auth methods (deleteUser, updateUser, ban/unban) extend this file
- Supabase Auth Admin API: `client.auth.admin.updateUserById()`, `client.auth.admin.deleteUser()` for password/ban/delete operations

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

*Phase: 02-server-api*
*Context gathered: 2026-03-20*
