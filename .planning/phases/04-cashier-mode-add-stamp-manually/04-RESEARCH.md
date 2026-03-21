# Phase 4: Cashier Mode Add Stamp Manually - Research

**Researched:** 2026-03-21
**Domain:** Nuxt 3 / Nitro server API, Vue 3 composables, Supabase PostgREST, cashier UX flow
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Customer lookup by **phone number only** (no name search, no browse list)
- If customer has **one** active stamp program at this business: auto-select it
- If customer has **multiple** stamp programs: show a list, cashier picks one
- After phone lookup, display **full stamp card** — customer name, phone, current stamps count, program name (same info as QR-verified view)
- Use the **same +/- counter (1-10)** as the existing QR flow for `per_transaction` programs
- Manual mode supports **adding stamps only** — redemption still requires QR scan
- After successful stamp add: **reset to scan page** (clear everything, ready for next customer)
- Manual mode lives **below the QR scanner** on the same `/cashier` page
- **Replace** the current "Atau masukkan kode manual" QR data paste section with a phone number search input
- After stamp add + reset, phone input is **cleared** (full reset, no retained values)
- If stamp program uses `amount_based` mode: show an **Rp amount input** instead of +/- counter
- Display a **preview** of calculated stamps before confirming (e.g., "Rp 50.000 = 5 stempel") based on `amount_per_stamp`
- For `per_transaction` programs: show the standard +/- counter

### Claude's Discretion

- Phone input formatting and validation UX (masking, auto-format)
- Loading states during phone lookup
- Error handling for customer not found, no stamp programs, inactive programs
- How to display the program picker when multiple programs exist (dropdown, radio, cards)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 4 extends the existing `/cashier` page with a phone-number-based customer lookup path that bypasses QR scanning. The feature is self-contained: one new server API endpoint (`GET /api/customers/lookup`) plus UI changes to `app/pages/cashier/index.vue`. No new routes, no new database tables, and no new composables are strictly required — the existing `useTransaction().addStamps()` handles the stamp-add action unchanged.

The critical architectural insight is that the cashier page has **no business slug in its URL** (`/cashier`, not `/cashier/:slug`). The server already knows the cashier's business via `requireMember(event, businessId)`, but the business ID must be derived from the authenticated member's scope — not passed as a query param from the client. The new lookup endpoint must resolve `businessId` from the authenticated session, mirroring the pattern in `server/api/staff/me.get.ts`.

After phone lookup the UI transitions into the `'customer'` state using the same `verifiedData` shape returned by `GET /api/qr/verify`, enabling full reuse of the existing customer card, stamp counter, and `handleAddStamp()` handler.

**Primary recommendation:** Add a `GET /api/customers/lookup` endpoint that accepts a `phone` query param, resolves the cashier's business from their auth session, normalizes the phone, queries `customers` → `customer_programs` → `program_stamp_config`, and returns a response shaped identically to the QR verify response. On the client, replace the `manualCode` input section with a phone search section that drives the same `'customer'` state flow.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt 3 / H3 | (project's Nuxt version) | Server event handler, `defineEventHandler`, `getQuery`, `createError` | Project standard for all API routes |
| Zod | (already installed) | Request validation schema | Used by all existing validators in `server/utils/validators.ts` |
| `@supabase/supabase-js` via `@nuxtjs/supabase` | (project version) | DB queries via service client | Established project pattern |
| Vue 3 Composition API | (Nuxt 3 built-in) | `ref`, `computed`, reactive state | Used throughout `cashier/index.vue` |
| `@nuxt/ui` UButton, UInput, UCard, UFormField, UBadge | (project version) | UI components | Project's component library |

**No new packages needed.** This phase adds zero new npm dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
server/api/customers/
├── index.get.ts         # EXISTS — customer list
├── [id].get.ts          # EXISTS — customer detail
├── register.post.ts     # EXISTS — customer registration
└── lookup.get.ts        # NEW — phone-based lookup for cashier

app/pages/cashier/
└── index.vue            # MODIFY — replace manualCode section, add phone lookup state

server/utils/
└── validators.ts        # MODIFY — add customerLookupSchema (phone query param)
```

### Pattern 1: Session-Derived Business ID (critical for cashier lookup)

**What:** The cashier does not have a business slug in the URL. The lookup endpoint must derive `businessId` from the logged-in member's session, not from a client-supplied query param.

**When to use:** Any endpoint called from `/cashier` that needs to scope queries to the cashier's business.

**How it works:** Call `requireMember(event, businessId)` — but first derive `businessId` from the member record.

```typescript
// Source: modeled on server/api/staff/me.get.ts pattern
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getServiceClient(event)

  // Step 1: Resolve member record and derive businessId from scope
  const { data: member } = await db
    .from('members')
    .select('id, scope_type, scope_id, is_active, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member || !member.is_active) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  let businessId: string
  if (member.scope_type === 'business') {
    businessId = member.scope_id
  } else {
    // branch-scoped: resolve via branches table
    const { data: branch } = await db
      .from('branches')
      .select('business_id')
      .eq('id', member.scope_id)
      .single()
    if (!branch) throw createError({ statusCode: 500, message: 'Cannot resolve business' })
    businessId = branch.business_id
  }

  // Now proceed with lookup scoped to businessId ...
})
```

**Important:** Do NOT follow `customers/index.get.ts` which uses `getBusinessIdFromQuery(event)` — that requires the client to pass `?business_id=...`, which the cashier page doesn't know.

### Pattern 2: Phone Normalization Before DB Query

**What:** Indonesian phone numbers arrive in multiple formats (08xx, 628xx, +628xx). Normalize before querying.

**When to use:** All phone-based customer lookups.

```typescript
// Source: server/utils/validators.ts — normalizePhone() already exists
import { normalizePhone, phoneSchema } from '../utils/validators'

const rawPhone = getQuery(event).phone as string
const validation = phoneSchema.safeParse(rawPhone)
if (!validation.success) {
  throw createError({ statusCode: 400, message: 'Format nomor telepon tidak valid' })
}
const normalizedPhone = normalizePhone(rawPhone)

const { data: customer } = await db
  .from('customers')
  .select('id, name, phone')
  .eq('phone', normalizedPhone)
  .maybeSingle()
```

**Note:** The `customers` table stores phone in normalized format (confirmed by `phoneSchema` regex and `normalizePhone` in validators.ts). Always normalize before querying.

### Pattern 3: Response Shape Matching QR Verify

**What:** The lookup endpoint returns data shaped identically to `GET /api/qr/verify` so the cashier page can reuse the existing `verifiedData` ref and customer state flow without branching.

**Shape to match (from `server/api/qr/verify.post.ts`):**
```typescript
return {
  verified: true,  // or omit — cashier page checks state, not verified flag
  customer_program: {
    id: string,
    customer_id: string,
    program_id: string,
    branch_id: string | null,
    is_active: boolean,
    enrolled_at: string,
    customers: { id: string, name: string, phone: string },
    programs: { id: string, name: string, type: string, business_id: string },
  },
  state: {
    // for stamp programs:
    current_stamps: number,
    total_stamps_earned: number,
    total_redemptions: number,
    updated_at: string,
  } | null,
  // NEW: stamp_config needed for amount_based preview
  stamp_config: {
    stamp_mode: 'per_transaction' | 'amount_based',
    amount_per_stamp: number | null,
    stamps_per_transaction: number,
    stamp_target: number,
  } | null,
}
```

**Why add `stamp_config`:** The QR verify endpoint does not return `stamp_config`. The manual flow needs it to render the amount-based input and calculate the stamp preview (e.g., "Rp 50.000 = 5 stempel"). The lookup endpoint should include it. The cashier page may also need it for the QR path — but scoping that change to this phase is optional; it only strictly needs to be in the lookup response.

### Pattern 4: Multi-Program Picker Flow (client-side state)

**What:** When lookup returns multiple stamp programs, the cashier must pick one before seeing the stamp card. This is a transient UI state — no new route needed.

**Recommended approach:** Extend the cashier's `state` ref with an intermediate `'program-select'` state:

```typescript
const state = ref<'scan' | 'program-select' | 'customer'>('scan')
const lookupResults = ref<LookupResult | null>(null)     // raw lookup response (may have multiple programs)
const selectedProgram = ref<CustomerProgram | null>(null) // chosen program
```

Flow:
1. Phone search → `lookupResults` has 1 program → auto-select → `state = 'customer'`
2. Phone search → `lookupResults` has 2+ programs → `state = 'program-select'` → cashier picks → `state = 'customer'`

**Display options (Claude's discretion):** Cards with program name + current stamp count are the most scannable at a glance. A simple list of `UButton` items styled as cards (one per program) avoids needing a dropdown.

### Pattern 5: Amount-Based Stamp Preview

**What:** For `amount_based` programs, show `UInput` for Rp amount + computed preview of stamp count.

```typescript
// Source: analogous to membership cashback preview in cashier/index.vue lines 148-151
const txAmount = ref(0)
const calculatedStamps = computed(() => {
  if (!txAmount.value || !stampConfig.value?.amount_per_stamp) return 0
  return Math.floor(txAmount.value / stampConfig.value.amount_per_stamp)
})
```

Preview text: `"Rp {{ txAmount.toLocaleString('id-ID') }} = {{ calculatedStamps }} stempel"` — only shown when `calculatedStamps > 0`.

When submitting: pass `transaction_amount: txAmount.value` (not `stamps_count`) to `addStamps()`. The server endpoint `stamp.post.ts` already handles this correctly (line 59: `Math.floor(transaction_amount / amount_per_stamp)`).

### Anti-Patterns to Avoid

- **Don't pass `business_id` from client to lookup endpoint.** The cashier page has no business slug. Derive it server-side from the session.
- **Don't create a new `verifiedData` shape for phone lookup.** Reuse the existing QR-verified shape so `handleAddStamp()` works unchanged.
- **Don't add a new composable for customer lookup.** A plain `$fetch` call inside `cashier/index.vue` (like `addStamps()` pattern) keeps things simple.
- **Don't forget `is_active` filter on `customer_programs`.** Inactive programs should not appear in the picker.
- **Don't filter only `stamp` programs on the client.** Filter server-side — the endpoint should only return `stamp` type programs (manual flow doesn't support membership).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone validation | Custom regex | `phoneSchema` in `validators.ts` | Already tested, handles +62/62/0 formats |
| Phone normalization | String manipulation inline | `normalizePhone()` in `validators.ts` | DB stores in +62 format — existing utility |
| Stamp add API call | Direct `$fetch` + custom logic | `useTransaction().addStamps()` | Already handles `customer_program_id`, `branch_id`, `stamps_count`, `transaction_amount` |
| Loading state | Custom loading flag | Existing `actionLoading` ref pattern | Already wired to `handleAddStamp()` — reuse |
| Toast notifications | Custom notification component | `useToast()` + `toast.add()` | Project-wide pattern, already in cashier page |
| Auth guard | Manual auth check | `requireUser()` + member resolution | Established auth.ts pattern |

**Key insight:** Everything the stamp-add action needs already exists. The net-new work is the customer lookup endpoint and the UI section that replaces `manualCode`.

---

## Common Pitfalls

### Pitfall 1: Client Supplying business_id to Lookup Endpoint

**What goes wrong:** Developer follows the pattern from `customers/index.get.ts` and requires `?business_id=...` as a query param. The cashier page at `/cashier` doesn't have this — it has no business slug in the URL, and the cashier composable doesn't expose an `activeBusinessId`.

**Why it happens:** Most other API endpoints use `getBusinessIdFromQuery()` because they're called from dashboard pages which have `/:businessSlug` in the route.

**How to avoid:** Derive `businessId` server-side from the authenticated member's session. See Pattern 1 above. The `staff/me.get.ts` endpoint does exactly this.

**Warning signs:** If you find yourself calling `useBusiness()` in `cashier/index.vue`, you're heading in the wrong direction.

### Pitfall 2: Returning All Programs (Including Membership) in Lookup

**What goes wrong:** The lookup endpoint returns all of a customer's programs, including membership programs. The manual stamp flow doesn't support membership, so showing them creates dead-end UI states.

**Why it happens:** Copy-pasting from `customers/[id].get.ts` which returns all program types.

**How to avoid:** Filter at the DB query level: `.eq('programs.type', 'stamp')`. Also filter `.eq('customer_programs.is_active', true)`.

### Pitfall 3: Phone Stored in Different Formats Causing Lookup Miss

**What goes wrong:** Customer registered with `08123456789`, stored as `+628123456789`. Cashier types `08123456789`. Query against `phone` without normalization returns null — false "customer not found".

**Why it happens:** Phone is stored normalized but lookup is done with raw input.

**How to avoid:** Always call `normalizePhone(rawPhone)` before querying. The `normalizePhone` utility is already in `validators.ts`.

### Pitfall 4: branch_id Null for Business-Scoped Programs

**What goes wrong:** `customer_programs.branch_id` is nullable. When it's null (for business-scoped program enrollments), passing `branch_id: null` to `addStamps()` will fail `stampAddSchema` validation (`branch_id: z.string().uuid()`).

**Why it happens:** `customer_programs.branch_id` reflects the branch at enrollment time, which can be null for business-scoped programs.

**How to avoid:** When `branch_id` is null on the customer program, fall back to the cashier's own `scope_id` if they are branch-scoped, or the business's default branch. Inspect how `verifyAndLoad()` resolves `branchId`: it uses `result.customer_program?.branch_id || ''`. This results in an empty string being submitted which will fail UUID validation. For the phone lookup path, resolve the cashier's `branchId` from their member scope (available server-side via `requireMember` → returned `branchId`). Include it in the lookup response so the client can use it as fallback.

**Warning signs:** 400 error "Invalid input" on stamp add despite valid customer program.

### Pitfall 5: Not Including stamp_config in Lookup Response

**What goes wrong:** The `amount_based` branch cannot render the stamp preview because `stamp_config.amount_per_stamp` is not in the response. Client shows a blank or broken preview.

**Why it happens:** QR verify doesn't include `stamp_config` because per-transaction stamp mode doesn't need it for display; the server calculates stamps. The manual flow needs to show a real-time preview.

**How to avoid:** The lookup endpoint must JOIN and return `program_stamp_config` fields. The cashier page uses this client-side to compute the preview before form submit.

### Pitfall 6: Forgetting to Clear Phone Input on Reset

**What goes wrong:** After successful stamp add and reset, the phone input retains the previous value. Next cashier action might accidentally re-lookup the same customer.

**Why it happens:** `resetState()` currently clears `manualCode` — the new `phoneSearch` ref must also be added to this function.

**How to avoid:** When adding the phone input ref, immediately add it to `resetState()`.

---

## Code Examples

Verified patterns from the existing codebase:

### Lookup Endpoint — Core Query Structure

```typescript
// server/api/customers/lookup.get.ts
// After resolving businessId from session (see Pattern 1):

const rawPhone = getQuery(event).phone as string
const validation = phoneSchema.safeParse(rawPhone)
if (!validation.success) {
  throw createError({ statusCode: 400, message: 'Format nomor telepon tidak valid' })
}
const normalizedPhone = normalizePhone(rawPhone)

// Step 1: Find customer
const { data: customer } = await db
  .from('customers')
  .select('id, name, phone')
  .eq('phone', normalizedPhone)
  .maybeSingle()

if (!customer) {
  throw createError({ statusCode: 404, message: 'Pelanggan tidak ditemukan' })
}

// Step 2: Find active stamp programs for this customer at this business
const { data: customerPrograms } = await db
  .from('customer_programs')
  .select(`
    id, program_id, branch_id, is_active, enrolled_at,
    programs!inner (id, name, type, business_id)
  `)
  .eq('customer_id', customer.id)
  .eq('is_active', true)
  .eq('programs.business_id', businessId)
  .eq('programs.type', 'stamp')

if (!customerPrograms || customerPrograms.length === 0) {
  throw createError({ statusCode: 404, message: 'Pelanggan tidak memiliki program stempel aktif' })
}
```

### Client State Extension Pattern

```typescript
// app/pages/cashier/index.vue additions (SOURCE: existing patterns in same file)

// Phone lookup state (replaces manualCode section)
const phoneSearch = ref('')
const phoneLoading = ref(false)
const phoneError = ref('')

// Lookup result — may contain multiple programs before selection
const lookupCustomer = ref<any>(null)
const lookupPrograms = ref<any[]>([])

// Stamp config from lookup (needed for amount_based preview)
const stampConfig = ref<any>(null)

// For amount_based programs
// txAmount ref already exists in file (line 228) — reuse it

const calculatedStampsFromAmount = computed(() => {
  if (!txAmount.value || !stampConfig.value?.amount_per_stamp) return 0
  return Math.floor(txAmount.value / stampConfig.value.amount_per_stamp)
})

// State machine extension
const state = ref<'scan' | 'program-select' | 'customer'>('scan')
```

### handleAddStamp Called Identically for Both Paths

```typescript
// SOURCE: app/pages/cashier/index.vue lines 312-330
// No changes needed — addStamps() takes the same payload regardless of how
// customerProgramId and branchId were set (via QR or via phone lookup):

async function handleAddStamp() {
  actionLoading.value = true
  try {
    const payload: any = {
      customer_program_id: customerProgramId.value,
      branch_id: branchId.value,
    }
    if (stampConfig.value?.stamp_mode === 'amount_based') {
      payload.transaction_amount = txAmount.value
    } else {
      payload.stamps_count = stampCount.value
    }
    const result = await addStamps(payload) as any
    // ... existing toast + reset logic
    resetState()  // full reset after success (per locked decision)
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal menambah stempel', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `manualCode` textarea for QR paste | Phone number search input | Phase 4 | Replaces the manualCode section entirely |
| Single state machine `'scan' \| 'customer'` | Extended with `'program-select'` | Phase 4 | Handles multi-program scenario |
| Stamp add requires QR token verification | Phone lookup bypasses QR entirely | Phase 4 | stamp_config must be fetched separately |

---

## Open Questions

1. **branch_id fallback when customer_programs.branch_id is null**
   - What we know: `branch_id` on `customer_programs` can be null (nullable in schema). `stampAddSchema` requires a UUID `branch_id`.
   - What's unclear: The exact fallback strategy. Options: (a) include the cashier's `branchId` in the lookup response for the client to use; (b) resolve server-side in `stamp.post.ts`.
   - Recommendation: Return `cashier_branch_id` from the lookup endpoint (the member's own branch scope if branch-scoped, or null if business-scoped). Client uses `customer_program.branch_id ?? cashier_branch_id` as the `branch_id` for the stamp add call. This mirrors how the QR path sets `branchId = result.customer_program?.branch_id || ''` but fixes the fallback gap.

2. **`programs.is_active` filter in lookup**
   - What we know: Programs have an `is_active` flag in the `programs` table (confirmed in database.types.ts). Current lookup plan filters on `customer_programs.is_active` but not `programs.is_active`.
   - What's unclear: Whether a program can be deactivated while customer enrollments remain active.
   - Recommendation: Add `.eq('programs.is_active', true)` to the lookup query to be safe. This prevents cashiers from adding stamps to a deactivated program.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (installed, configured) |
| Config file | `vitest.config.ts` — `include: ['tests/**/*.test.ts']` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| — | `phoneSchema` accepts valid Indonesian phones | unit | `npm test -- --reporter=verbose` | ✅ (`tests/unit/validators.test.ts` has schema tests) |
| — | `phoneSchema` rejects invalid phones | unit | `npm test` | ✅ |
| — | `normalizePhone` converts `08xx` → `+628xx` | unit | `npm test` | ❌ Wave 0 |
| — | `customerLookupSchema` (new) validates phone query | unit | `npm test` | ❌ Wave 0 |
| — | Stamp preview calculation (`floor(amount / amount_per_stamp)`) | unit | `npm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/validators.test.ts` — add `normalizePhone` coverage (the function exists but no test exists for it)
- [ ] `tests/unit/validators.test.ts` — add `customerLookupSchema` tests once schema is added to `validators.ts`
- [ ] `tests/unit/stamp-preview.test.ts` — pure function test for `Math.floor(amount / amountPerStamp)` edge cases (amount = 0, amount_per_stamp = 0, fractional result)

---

## Sources

### Primary (HIGH confidence)
- Codebase: `app/pages/cashier/index.vue` — complete cashier page implementation
- Codebase: `server/api/transactions/stamp.post.ts` — stamp add endpoint logic and schema usage
- Codebase: `server/utils/validators.ts` — `phoneSchema`, `normalizePhone`, `stampAddSchema`
- Codebase: `server/api/qr/verify.post.ts` — QR verify response shape to match
- Codebase: `server/api/customers/[id].get.ts` — customer + programs query pattern
- Codebase: `server/api/staff/me.get.ts` — session-derived businessId resolution pattern
- Codebase: `server/utils/auth.ts` — `requireUser`, `requireMember`, `MemberAccess` types
- Codebase: `app/types/database.types.ts` — `customer_programs`, `program_stamp_config`, `customers` schemas

### Secondary (MEDIUM confidence)
- Nuxt 3 docs: Nitro auto-imports server/utils — confirmed via prior phase decision in STATE.md
- `@nuxt/ui` component library: `UButton`, `UInput`, `UCard`, `UFormField` — used throughout codebase

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture patterns: HIGH — derived from reading actual source files, not assumptions
- Pitfalls: HIGH — derived from actual schema inspection (nullable branch_id, phone normalization utility existence)
- API design: HIGH — response shape directly traceable to QR verify endpoint

**Research date:** 2026-03-21
**Valid until:** 2026-06-01 (stable — no fast-moving dependencies; all patterns are internal to codebase)
