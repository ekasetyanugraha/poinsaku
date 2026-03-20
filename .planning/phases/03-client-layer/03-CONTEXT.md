# Phase 3: Client Layer - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Owner-facing staff management UI integrated into the existing members page (display, create, actions) and a dedicated staff login page with role-based routing. This phase consumes the `/api/staff/` endpoints built in Phase 2 and makes all staff management operations accessible through the browser.

</domain>

<decisions>
## Implementation Decisions

### Staff List Presentation
- Full detail rows: each staff card shows email, display name (email fallback if null), role badge, branch/scope badge, active/inactive status badge, and relative last login time ('2 jam lalu', 'Kemarin')
- Owner row appears at top with 'Pemilik' badge — no action controls shown for owner
- Inactive staff rows are dimmed (reduced opacity) with a red/gray 'Nonaktif' badge — still visible and actionable (reactivate, delete)
- No filtering or separate sections — all staff in one list

### Staff Creation Form
- Slideover panel (slides from right) — keeps staff list visible behind
- Fields: email (required), password (required), display name (optional), role (admin/cashier), scope type + scope ID
- Scope has NO default — owner must explicitly choose business or branch every time (prevents accidental business-wide assignment)
- Display name is optional — list falls back to email when null
- On success: toast notification ('Staff berhasil dibuat'), slideover closes, list refreshes

### Per-row Staff Actions
- Three-dot dropdown menu per staff row with actions: Reset Password, Nonaktifkan/Aktifkan, Pindah Cabang, Hapus
- Dropdown shows contextual actions: 'Nonaktifkan' for active staff, 'Aktifkan' for inactive staff
- No action menu on owner rows
- Destructive actions (delete, deactivate) confirmed via modal dialog ('Hapus staff Budi?')
- Password reset: modal with password input field — owner types the new password (consistent with creation flow)
- Branch reassignment: modal showing current branch + dropdown to pick new branch

### Staff Login & Routing
- Staff login page at `/staff/login` — minimal, stripped-down design (just email + password fields, no decorative elements, no 'Daftar' link). Functional POS-style.
- After login: auto-redirect by role — cashier goes to `/cashier`, admin goes to `/dashboard/[businessSlug]`
- Role + scope determined by member lookup after authentication
- AUTH-03 enforced at both UI and API: password change UI hidden for staff roles AND API rejects staff password change requests
- Deactivated staff see specific error: 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.' (not generic credentials error)

### Claude's Discretion
- Exact slideover width and animation
- Loading skeleton design for staff list
- Empty state design when no staff exist
- Error handling UX for failed API calls
- Exact layout of the creation form fields
- How admin role resolves the businessSlug for redirect after login

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing UI (being enhanced)
- `app/pages/dashboard/[businessSlug]/members.vue` — Current members page with invite form and list; will be rewritten to use staff endpoints and new presentation
- `app/pages/login.vue` — Owner login page; staff login page should follow minimal variant of this pattern
- `app/layouts/dashboard.vue` — Dashboard layout; staff members page uses this

### Composables (being extended)
- `app/composables/useMember.ts` — Current member composable fetching from `/api/members`; needs to call `/api/staff` endpoints instead
- `app/composables/useAuth.ts` — Auth composable with role detection; used for staff routing logic
- `app/composables/usePermission.ts` — Permission checks (isOwner, canManageMembers); controls action visibility
- `app/composables/useBranch.ts` — Branch data; used in creation form and reassignment modal

### Server API (Phase 2 endpoints consumed by this phase)
- `server/api/staff/index.post.ts` — POST /api/staff (create staff)
- `server/api/staff/[id]/index.delete.ts` — DELETE /api/staff/[id] (delete staff)
- `server/api/staff/[id]/password.put.ts` — PUT /api/staff/[id]/password (reset password)
- `server/api/staff/[id]/status.put.ts` — PUT /api/staff/[id]/status (deactivate/reactivate)
- `server/api/staff/[id]/branch.put.ts` — PUT /api/staff/[id]/branch (reassign)

### Auth & Routing
- `app/middleware/auth.ts` — Current auth middleware; needs staff login redirect logic
- `app/pages/cashier/index.vue` — Existing cashier page (cashier landing after login)

### Project Context
- `.planning/ROADMAP.md` — Phase 3 success criteria (5 items)
- `.planning/REQUIREMENTS.md` — DISP-01 through DISP-04, AUTH-01 through AUTH-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMember()` composable: Already has refresh, loading, inviteMember, updateMember, removeMember — needs new methods for staff endpoints (createStaff, resetPassword, toggleStatus, reassignBranch, deleteStaff)
- `usePermission()` composable: isOwner, canManageMembers — drives action visibility in staff list
- `useBranch()` composable: provides branch list for creation form and reassignment modal
- `useAuth()` composable: role detection — extend for staff post-login routing
- Nuxt UI components: UCard, UBadge, UButton, UFormField, UInput, USelect, URadioGroup, USlideover, UDropdownMenu, UModal — all available

### Established Patterns
- Event handler pattern: `definePageMeta({ layout: 'dashboard', middleware: ['auth'] })`
- Toast notifications: `toast.add({ title, color, icon })` for success/error feedback
- Indonesian language UI: all labels, messages in Bahasa Indonesia
- Glass card styling: `class="glass-card"` or `class="glass"` on UCard components
- Composable-based data fetching: `useFetch()` with computed query params and watch triggers

### Integration Points
- `app/pages/dashboard/[businessSlug]/members.vue` — Primary page to rewrite
- `app/middleware/auth.ts` — Add staff login redirect (unauthenticated staff → /staff/login)
- `app/composables/useMember.ts` — Add staff-specific API methods or create new `useStaff.ts`
- New page: `app/pages/staff/login.vue` — Does not exist yet
- Supabase client: `useSupabaseClient()` for auth.signInWithPassword on staff login page (allowed — auth operations are client-side per architecture rules)

</code_context>

<specifics>
## Specific Ideas

- Staff login should be minimal/POS-style — no decorative gradients or blur elements like the owner login
- Deactivated staff get a helpful specific message on login failure, not a generic credentials error
- Owner explicitly picks scope every time during creation — no defaults to prevent accidents
- Password reset modal uses same password input pattern as creation form for consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-client-layer*
*Context gathered: 2026-03-20*
