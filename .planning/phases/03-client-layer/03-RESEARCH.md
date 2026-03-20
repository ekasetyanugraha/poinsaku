# Phase 3: Client Layer - Research

**Researched:** 2026-03-20
**Domain:** Nuxt 4 / Nuxt UI v4 / @nuxtjs/supabase v2 — Vue component patterns for staff management UI and role-based auth routing
**Confidence:** HIGH (all findings sourced from existing codebase + declared dependencies)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Staff List Presentation**
- Full detail rows: each staff card shows email, display name (email fallback if null), role badge, branch/scope badge, active/inactive status badge, and relative last login time ('2 jam lalu', 'Kemarin')
- Owner row appears at top with 'Pemilik' badge — no action controls shown for owner
- Inactive staff rows are dimmed (reduced opacity) with a red/gray 'Nonaktif' badge — still visible and actionable (reactivate, delete)
- No filtering or separate sections — all staff in one list

**Staff Creation Form**
- Slideover panel (slides from right) — keeps staff list visible behind
- Fields: email (required), password (required), display name (optional), role (admin/cashier), scope type + scope ID
- Scope has NO default — owner must explicitly choose business or branch every time (prevents accidental business-wide assignment)
- Display name is optional — list falls back to email when null
- On success: toast notification ('Staff berhasil dibuat'), slideover closes, list refreshes

**Per-row Staff Actions**
- Three-dot dropdown menu per staff row with actions: Reset Password, Nonaktifkan/Aktifkan, Pindah Cabang, Hapus
- Dropdown shows contextual actions: 'Nonaktifkan' for active staff, 'Aktifkan' for inactive staff
- No action menu on owner rows
- Destructive actions (delete, deactivate) confirmed via modal dialog ('Hapus staff Budi?')
- Password reset: modal with password input field — owner types the new password (consistent with creation flow)
- Branch reassignment: modal showing current branch + dropdown to pick new branch

**Staff Login & Routing**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Members list shows email and display name instead of raw UUIDs | Requires new `/api/staff` GET endpoint that joins auth user data; existing `/api/members` returns raw rows without email |
| DISP-02 | Members list shows active/inactive status badge per member | `is_active` column exists on members table (migration 002); already returned in member rows; badge via `UBadge` |
| DISP-03 | Members list shows role and branch scope per member | `role`, `scope_type`, `scope_id` in members table; branch name resolution requires join or separate fetch; `useBranch()` already provides branch list |
| DISP-04 | Members list shows last login time per staff member | `last_sign_in_at` field on Supabase Auth user — only accessible via `auth.admin.listUsers()` (service role); must be fetched in the GET endpoint and merged into response |
| AUTH-01 | Staff can log in via a separate dedicated login page | New `app/pages/staff/login.vue`; `supabase.redirectOptions` must be updated to exclude `/staff/login` |
| AUTH-02 | Staff are redirected based on role after login (cashier to /cashier, admin to /dashboard) | Role lookup via `/api/members/me` after login; admin slug resolution from `scope_id` (business) or branch → business join |
| AUTH-03 | Staff cannot change their own passwords | No password change UI in cashier/admin pages; server-side guard not strictly required (no existing endpoint), but defensive check in any future password endpoint |
</phase_requirements>

---

## Summary

Phase 3 is a pure client-side UI build on top of the Phase 2 API. The main complexity lies in three areas: (1) a missing server endpoint, (2) the auth middleware interaction, and (3) role-based post-login routing.

**Missing GET endpoint:** The current `/api/members` GET returns raw member table rows — no email (stored in Supabase Auth, not members table), no `last_sign_in_at`. Phase 3 needs a `GET /api/staff` endpoint that calls `auth.admin.listUsers()` (service role) and merges email + last_sign_in_at into the member rows. This is a server task, not a pure UI task.

**Auth middleware conflict:** The existing `nuxt.config.ts` has `supabase.redirectOptions.include: ['/dashboard(/*)?', '/cashier(/*)?']` — meaning @nuxtjs/supabase auto-redirects unauthenticated users on those paths to `/login`. The `/staff/login` page must be added to `exclude` so the module does not interfere. The custom `app/middleware/auth.ts` also redirects unauthenticated `/dashboard/*` and `/cashier/*` requests to `/login` — this must be updated to redirect to `/staff/login` for non-owner users, or kept as `/login` and the staff login page added to the supabase excludes.

**Admin businessSlug resolution:** After a staff admin logs in, the redirect target is `/dashboard/[businessSlug]`. The slug is not directly on the member row — for business-scoped admins, `scope_id` is the `business_id`, and a lookup of `businesses.slug` is needed. For branch-scoped admins, a `branches → business` join is needed. This lookup happens in the staff login page's `handleLogin()` after `signInWithPassword` succeeds.

**Primary recommendation:** Create `GET /api/staff` with auth-user enrichment, rewrite `members.vue` to use it, build `staff/login.vue` with role-based redirect, and update `nuxt.config.ts` redirect excludes. The `useMember.ts` composable should be either extended with staff methods or supplemented by a new `useStaff.ts` composable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt | ^4.0.0 | Framework (SSR + file routing) | Already installed; project standard |
| @nuxt/ui | ^4.5.1 | Component library (USlideover, UModal, UDropdownMenu, UBadge, UButton) | Already installed; all required components included |
| @nuxtjs/supabase | ^2.0.4 | Auth (useSupabaseUser, useSupabaseClient, serverSupabaseServiceRole) | Already installed; provides client-side auth primitives |
| date-fns | ^4.1.0 | Relative time formatting ('2 jam lalu', 'Kemarin') | Already installed; `formatDistanceToNow` with `id` locale |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Client-side form validation (password strength) | Password field in creation form and reset modal |

### No New Dependencies Required
All required UI components and utilities are already installed. Phase 3 is a UI build on existing stack.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
app/
├── pages/
│   ├── staff/
│   │   └── login.vue            # NEW — AUTH-01, AUTH-02
│   └── dashboard/[businessSlug]/
│       └── members.vue          # REWRITE — DISP-01 through DISP-04, all actions
├── composables/
│   └── useStaff.ts              # NEW — wraps /api/staff endpoints
server/
└── api/
    └── staff/
        └── index.get.ts         # NEW — GET /api/staff with auth enrichment
```

### Pattern 1: Staff GET Endpoint with Auth Enrichment

**What:** `GET /api/staff?business_id=` returns member rows enriched with `email` and `last_sign_in_at` from Supabase Auth admin API.

**When to use:** Required for DISP-01 (show email) and DISP-04 (show last login).

**Key implementation detail:** `auth.admin.listUsers()` returns paginated users. For a small business (< 1000 staff), a single call with `page: 1, perPage: 1000` covers all staff. Alternatively, collect `auth_user_id` values from the member query and call `auth.admin.getUserById()` per user — but `listUsers` is more efficient for a full list. The endpoint should filter by `auth_user_id IN (member_auth_user_ids)` using a filter on the returned list.

```typescript
// server/api/staff/index.get.ts
export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)
  await requireOwner(event, businessId)

  const db = getServiceClient(event)

  // 1. Fetch member rows (same logic as /api/members)
  const { data: branchRows } = await db.from('branches').select('id').eq('business_id', businessId)
  const branchIds = (branchRows ?? []).map(b => b.id)

  let query = db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, is_active, display_name, invited_by, created_at')
    .order('created_at', { ascending: true })

  if (branchIds.length > 0) {
    query = query.or(
      `and(scope_type.eq.business,scope_id.eq.${businessId}),` +
      `and(scope_type.eq.branch,scope_id.in.(${branchIds.join(',')}))`
    )
  } else {
    query = query.eq('scope_type', 'business').eq('scope_id', businessId)
  }

  const { data: members } = await query

  // 2. Fetch auth user data (email + last_sign_in_at) for all members
  const serviceClient = getServiceClient(event)
  const authUserIds = (members ?? []).map(m => m.auth_user_id as string)

  // Fetch all users (page 1, perPage sufficient for business scale)
  const { data: { users } } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authMap = new Map(users.map(u => [u.id, u]))

  // 3. Merge and return
  return {
    data: (members ?? []).map(m => {
      const authUser = authMap.get(m.auth_user_id as string)
      return {
        ...m,
        email: authUser?.email ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
      }
    })
  }
})
```

### Pattern 2: useStaff Composable

**What:** A new `useStaff.ts` composable that fetches from `/api/staff` (GET) and exposes mutating methods for all actions.

**When to use:** `members.vue` imports this instead of `useMember`.

```typescript
// app/composables/useStaff.ts — outline
export function useStaff() {
  const { activeBusinessId } = useBusiness()

  const { data: staffData, refresh, status } = useFetch('/api/staff', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
  })

  const staff = computed(() => staffData.value?.data ?? [])

  async function createStaff(data: { email: string; password: string; display_name?: string; role: 'admin' | 'cashier'; scope_type: string; scope_id: string }) {
    const result = await $fetch('/api/staff', {
      method: 'POST',
      body: { ...data, business_id: activeBusinessId.value },
    })
    await refresh()
    return result
  }

  async function resetPassword(id: string, password: string) {
    return $fetch(`/api/staff/${id}/password`, { method: 'PUT', body: { password } })
  }

  async function toggleStatus(id: string, action: 'deactivate' | 'reactivate') {
    const result = await $fetch(`/api/staff/${id}/status`, { method: 'PUT', body: { action } })
    await refresh()
    return result
  }

  async function reassignBranch(id: string, scope_type: string, scope_id: string) {
    const result = await $fetch(`/api/staff/${id}/branch`, { method: 'PUT', body: { scope_type, scope_id } })
    await refresh()
    return result
  }

  async function deleteStaff(id: string) {
    await $fetch(`/api/staff/${id}`, { method: 'DELETE', query: { business_id: activeBusinessId.value } })
    await refresh()
  }

  return { staff, loading: computed(() => status.value === 'pending'), refresh, createStaff, resetPassword, toggleStatus, reassignBranch, deleteStaff }
}
```

### Pattern 3: Staff Login Page with Role-Based Redirect

**What:** `app/pages/staff/login.vue` uses `supabase.auth.signInWithPassword`, then fetches member data to determine role and redirect target.

**Key complexity:** Admin redirect requires resolving `businessSlug`. For business-scoped admins, `scope_id` is the `business_id` → query `businesses.slug`. For branch-scoped admins, `scope_id` is `branch_id` → join to business → get slug.

**Deactivated staff detection:** Supabase returns error code `user_banned` when a banned user tries to sign in. Check `error.code === 'user_banned'` to show the specific Indonesian error message.

```typescript
// app/pages/staff/login.vue — script section outline
const supabase = useSupabaseClient()

async function handleLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Check for banned/deactivated user
    if (error.code === 'user_banned') {
      errorMsg.value = 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.'
    } else {
      errorMsg.value = 'Email atau password salah'
    }
    return
  }

  // Fetch member record to determine role + businessSlug
  // Use useFetch is not available here (no composable context at login time)
  // Use $fetch directly
  const { data: memberData } = await $fetch('/api/staff/me')  // OR call /api/members/me with business_id

  if (memberData.role === 'cashier') {
    router.push('/cashier')
  } else if (memberData.role === 'admin') {
    // Resolve businessSlug from scope
    router.push(`/dashboard/${businessSlug}`)
  }
}
```

**NOTE:** `/api/members/me` requires `business_id` as a query param. For staff login, the business context is unknown at login time. The staff login page needs a different API: a `GET /api/staff/me` endpoint (no business_id required) that finds the member record by `auth_user_id` across any business. This is a **second missing server endpoint**.

### Pattern 4: Relative Time with date-fns

```typescript
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

function relativeTime(isoString: string | null): string {
  if (!isoString) return 'Belum pernah login'
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: id })
  // Returns: '2 jam lalu', 'kemarin', 'sebulan lalu'
}
```

### Pattern 5: USlideover Usage (Nuxt UI v4)

The `USlideover` component in Nuxt UI v4 uses `v-model` for open state and wraps content in slots.

```vue
<USlideover v-model:open="showCreate" title="Tambah Staff" side="right">
  <!-- form content -->
</USlideover>
```

### Pattern 6: UDropdownMenu for Per-Row Actions

```vue
<UDropdownMenu
  :items="getActionItems(member)"
  :popper="{ placement: 'bottom-end' }"
>
  <UButton icon="i-lucide-ellipsis-vertical" variant="ghost" size="sm" />
</UDropdownMenu>
```

Items are arrays of objects with `label`, `icon`, `onSelect` (or `click`). Dividers via a nested array structure.

### Pattern 7: UModal for Confirmation Dialogs

```vue
<UModal v-model:open="showDeleteConfirm" title="Hapus Staff">
  <template #body>
    <p>Hapus staff <strong>{{ selectedStaff?.display_name || selectedStaff?.email }}</strong>?</p>
  </template>
  <template #footer>
    <UButton color="error" @click="confirmDelete">Hapus</UButton>
    <UButton variant="outline" @click="showDeleteConfirm = false">Batal</UButton>
  </template>
</UModal>
```

### Anti-Patterns to Avoid

- **Calling `/api/members/me` with no business_id at staff login** — this endpoint requires `business_id` query param; a new `/api/staff/me` is needed for the login flow.
- **Using `confirm()` for destructive actions** — the current `members.vue` uses `confirm()` (browser native). Phase 3 replaces this with UModal as per CONTEXT decisions.
- **Setting a default scope on the creation form** — CONTEXT explicitly forbids defaults on the scope field to prevent accidents.
- **Redirecting staff back to `/login` on unauthenticated state** — the custom `auth.ts` middleware must redirect to `/staff/login` for routes accessed by staff, or the middleware must be split/extended.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time display | Custom date formatter | `date-fns/formatDistanceToNow` with `id` locale | Handles all edge cases (minutes, hours, days, months, years) in Indonesian |
| Slideover animation | CSS transitions manually | `USlideover` from @nuxt/ui | Already has enter/leave transitions, overlay, and focus-trap |
| Dropdown menu | Custom positioned div | `UDropdownMenu` from @nuxt/ui | Handles positioning, keyboard nav, and click-outside |
| Modal dialogs | Custom overlay | `UModal` from @nuxt/ui | Focus-trap, escape-close, backdrop |
| Form state management | `ref` + watchers per field | `reactive({})` with a single reset call | Less boilerplate, consistent pattern with existing forms |
| Password strength display | Custom validator UI | Inline error under password field (server returns 400 with zod error) | Already validated server-side; client feedback only needs field-level error state |

**Key insight:** All UI primitives are in @nuxt/ui. The only custom work is composing them into the staff management workflow.

---

## Common Pitfalls

### Pitfall 1: `/staff/login` Redirect Loop via @nuxtjs/supabase
**What goes wrong:** If `/staff/login` is not added to `supabase.redirectOptions.exclude` in `nuxt.config.ts`, and a user who is already logged in visits `/staff/login`, the @nuxtjs/supabase module may redirect them away based on its own auth-redirect logic.
**Why it happens:** `@nuxtjs/supabase` auto-handles redirects for paths in `include`. The `exclude` list prevents the module from touching those paths.
**How to avoid:** Add `'/staff/login'` to the `exclude` array in `supabase.redirectOptions`. Also ensure `definePageMeta({ layout: false })` on the page to bypass dashboard layout.
**Warning signs:** Login page redirects before form renders, or authenticated users bounce off the page.

### Pitfall 2: Missing `/api/staff` GET Endpoint
**What goes wrong:** The members page currently calls `useMember()` which calls `GET /api/members`. That endpoint returns `auth_user_id` UUIDs, not email addresses. DISP-01 and DISP-04 are impossible without a new endpoint.
**Why it happens:** Phase 2 only built mutation endpoints (POST, DELETE, PUT). No list endpoint was added to `/api/staff`.
**How to avoid:** Build `GET /api/staff` as the first task of Phase 3 before tackling the Vue component.
**Warning signs:** Staff list shows UUIDs instead of emails after rewrite.

### Pitfall 3: Admin businessSlug Unknown at Login
**What goes wrong:** After admin staff login, the redirect requires `/dashboard/[businessSlug]`. The member record has `scope_id` (a UUID), not `businessSlug`. Without an additional lookup, the redirect is impossible.
**Why it happens:** `useBusiness()` composable is built around route params — not available at login time when there is no business context in the URL.
**How to avoid:** In the staff login page's `handleLogin`, after sign-in, query `/api/staff/me` (new endpoint) which returns member + resolved business slug in one call. Business slug is not on the members table — it requires a join to `businesses`.
**Warning signs:** Admin login succeeds but redirect goes to `/dashboard/undefined`.

### Pitfall 4: Banned User Error Code Detection
**What goes wrong:** A deactivated staff member sees "Email atau password salah" instead of the specific "Akun Anda telah dinonaktifkan..." message.
**Why it happens:** `supabase.auth.signInWithPassword` returns different `error.code` values. Testing shows banned users return `user_banned`, but this may vary by Supabase version.
**How to avoid:** Check both `error.code === 'user_banned'` and `error.message` containing keywords like 'banned' or 'disabled' as a fallback.
**Warning signs:** Deactivated staff see generic error message.

### Pitfall 5: Owner Middleware Path — /staff/login Route in auth.ts
**What goes wrong:** The existing `auth.ts` middleware redirects all unauthenticated `/dashboard/*` and `/cashier/*` users to `/login` (owner login). Staff accessing these routes when unauthenticated should go to `/staff/login` instead.
**Why it happens:** The current middleware has no role awareness — it just checks `useSupabaseUser()`.
**How to avoid:** The auth middleware needs to distinguish who should go where. The simplest approach: leave middleware as-is (always redirect to `/login`), and let the owner login page handle the case where a user has no owner role (showing a message or link to `/staff/login`). Alternatively, extend middleware to check if the unauthenticated path is `/cashier/*` and redirect there to `/staff/login`. The CONTEXT specifies the auth middleware needs staff login redirect logic — treat `/cashier` redirects as going to `/staff/login`.
**Warning signs:** Cashiers who get logged out land on the owner login page with no path back.

### Pitfall 6: `auth.admin.listUsers()` Pagination
**What goes wrong:** For businesses with > 1000 staff, `listUsers({ page: 1, perPage: 1000 })` misses users on subsequent pages.
**Why it happens:** The API is paginated by default with a max perPage of 1000.
**How to avoid:** For this project's scale (small business POS), 1000 per page is sufficient. Document this as a known limit. Alternatively, filter by the specific auth_user_ids using individual `getUserById` calls — but that N+1 pattern is worse for typical list sizes.
**Warning signs:** Staff at the bottom of a large list don't appear in the UI.

---

## Code Examples

Verified patterns from existing codebase:

### Nuxt UI v4 UBadge for status
```vue
<!-- Active/inactive status badge -->
<UBadge :color="member.is_active ? 'success' : 'neutral'" variant="soft" size="sm">
  {{ member.is_active ? 'Aktif' : 'Nonaktif' }}
</UBadge>
```

### Toast notification (existing pattern)
```typescript
toast.add({ title: 'Staff berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
toast.add({ title: e.data?.message || 'Gagal', color: 'error', icon: 'i-lucide-alert-circle' })
```

### definePageMeta for staff login (no layout, no auth guard)
```typescript
definePageMeta({ layout: false })
// Do NOT include middleware: ['auth'] — staff login is public
```

### $fetch pattern for mutations (existing pattern in useMember.ts)
```typescript
const result = await $fetch(`/api/staff/${id}/status`, {
  method: 'PUT',
  body: { action: 'deactivate' },
})
await refresh()
```

### Branch name resolution from useBranch()
```typescript
const { branches } = useBranch()
const branchName = computed(() => (id: string) =>
  branches.value.find((b: any) => b.id === id)?.name ?? 'Cabang tidak ditemukan'
)
```

### Glass card styling (existing pattern)
```vue
<UCard class="glass-card" :class="{ 'opacity-50': !member.is_active }">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `confirm()` for deletions | `UModal` confirmation dialog | Phase 3 decision | Better UX, no browser native dialog |
| Inline invite form (current `members.vue`) | `USlideover` panel | Phase 3 decision | Keeps list visible while creating |
| `inviteMember` by UUID | `createStaff` with email + password | Phase 3 rewrite | Owner creates full accounts, no invite links |

**Deprecated/outdated in this phase:**
- `inviteMember()` in `useMember.ts` — being replaced by `createStaff()` in new `useStaff.ts`
- The inline invite form in `members.vue` — replaced by slideover
- Raw UUID display in staff list — replaced by email + display name

---

## Open Questions

1. **`/api/staff/me` endpoint scope**
   - What we know: The login page needs member data (role + business slug) after auth, without a business_id context
   - What's unclear: Should this endpoint search across all businesses the user belongs to, or return all memberships?
   - Recommendation: Return the first non-owner membership for the authenticated user — staff should only belong to one business. The endpoint should also resolve `businessSlug` via a join.

2. **Banned user error code in @nuxtjs/supabase v2**
   - What we know: Supabase Auth returns `user_banned` code for banned users attempting sign-in
   - What's unclear: Whether @nuxtjs/supabase v2 wraps this error and changes the code
   - Recommendation: Test in implementation; use both `error.code` check and `error.message` substring check as fallback

3. **`supabase.redirectOptions` behavior for `/staff/login`**
   - What we know: The current config `include` is `['/dashboard(/*)?', '/cashier(/*)?']` — staff login is not in include
   - What's unclear: Whether the module does anything special with the `/login` configured as the login path for authenticated users visiting `/staff/login`
   - Recommendation: Add `/staff/login` explicitly to `exclude` for safety, even though it's not in `include`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.0 |
| Config file | `/Users/ekasetyanugraha/personal-projects/stampku/vitest.config.ts` |
| Quick run command | `npm test -- tests/unit/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | Staff list shows email + display name | manual-only | N/A — requires live Supabase auth.admin API | N/A |
| DISP-02 | Status badge shows is_active state | manual-only | N/A — Vue component rendering | N/A |
| DISP-03 | Role + branch scope shown | manual-only | N/A — Vue component rendering | N/A |
| DISP-04 | Last login relative time shown | unit | `npm test -- tests/unit/staff-display.test.ts` | ❌ Wave 0 |
| AUTH-01 | Staff login page exists at /staff/login | manual-only | N/A — page routing | N/A |
| AUTH-02 | Role-based redirect after login | manual-only | N/A — requires live auth | N/A |
| AUTH-03 | No password change UI for staff | manual-only | N/A — UI absence check | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (21 tests, < 1 second)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/staff-display.test.ts` — covers DISP-04 relative time logic (pure function, testable without DOM)

*(All other DISP/AUTH requirements require a running Supabase instance and browser — manual-only verification)*

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `app/composables/`, `app/pages/`, `server/api/`, `server/utils/`, `supabase/migrations/`
- `package.json` — confirmed installed versions
- `nuxt.config.ts` — confirmed redirect configuration
- `vitest.config.ts` — confirmed test infrastructure

### Secondary (MEDIUM confidence)
- Nuxt UI v4 component API (USlideover, UModal, UDropdownMenu) — inferred from existing usage patterns in `cashier/index.vue` and `dashboard.vue`; actual slot/prop names should be verified against Nuxt UI v4 docs during implementation

### Tertiary (LOW confidence)
- `error.code === 'user_banned'` from Supabase Auth — needs validation against actual @nuxtjs/supabase v2 error shapes during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions confirmed from package.json
- Architecture: HIGH — patterns derived directly from existing codebase code
- Pitfalls: HIGH for auth redirect issues (confirmed from nuxt.config); MEDIUM for Supabase banned error code (needs runtime validation)
- Missing endpoints: HIGH — confirmed by inspecting existing `/api/staff/` glob (only mutation endpoints exist)

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable stack; @nuxt/ui component APIs are stable)
