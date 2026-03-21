# Phase 4: Cashier mode add stamp manually - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow cashiers to add stamps to a customer's stamp card without requiring QR scan. Cashier looks up customer by phone number and adds stamps manually. This extends the existing `/cashier` page — no new routes, no new API resources beyond a customer lookup endpoint.

</domain>

<decisions>
## Implementation Decisions

### Customer Lookup
- Cashier searches by **phone number** only (no name search, no browse list)
- If customer has **one** active stamp program at this business: auto-select it
- If customer has **multiple** stamp programs: show a list, cashier picks one
- After phone lookup, display **full stamp card** — customer name, phone, current stamps count, program name (same info as QR-verified view)

### Stamp Input Flow
- Use the **same +/- counter (1-10)** as the existing QR flow for per_transaction programs
- Manual mode supports **adding stamps only** — redemption (tukarkan hadiah) still requires QR scan for security
- After successful stamp add: **reset to scan page** (clear everything, ready for next customer)

### Page Integration
- Manual mode lives **below the QR scanner** on the same `/cashier` page
- **Replace** the current "Atau masukkan kode manual" QR data paste section with a phone number search input
- After stamp add + reset, phone input is **cleared** (full reset, no retained values)

### Transaction Amount (amount_based programs)
- If the stamp program uses `amount_based` mode: show an **Rp amount input** instead of the +/- counter
- Display a **preview** of calculated stamps before confirming (e.g., "Rp 50.000 = 5 stempel") based on program's `amount_per_stamp` config
- For `per_transaction` programs: show the standard +/- counter

### Claude's Discretion
- Phone input formatting and validation UX (masking, auto-format)
- Loading states during phone lookup
- Error handling for customer not found, no stamp programs, inactive programs
- How to display the program picker when multiple programs exist (dropdown, radio, cards)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cashier flow
- `app/pages/cashier/index.vue` — Current cashier page with QR scan, manual code entry, stamp add/redeem UI, and all action handlers
- `server/api/transactions/stamp.post.ts` — Stamp add endpoint, supports `stamps_count` override and `transaction_amount` for amount_based mode

### Validation and schemas
- `server/utils/validators.ts` — `stampAddSchema` (customer_program_id, branch_id, transaction_amount, stamps_count, notes), `phoneSchema` for phone validation

### Composables
- `app/composables/useTransaction.ts` — `addStamps()`, `verifyQr()`, and other transaction functions
- `app/composables/useAuth.ts` — Current user/member context for branch_id resolution

### Data model
- `app/types/database.types.ts` — `customer_programs`, `customer_stamp_progress`, `program_stamp_config` table types

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTransaction().addStamps()` — Already calls `POST /api/transactions/stamp` with `customer_program_id`, `branch_id`, `stamps_count`; can be reused directly
- `stampAddSchema` in `server/utils/validators.ts` — Already validates stamp add requests including optional `transaction_amount`
- `phoneSchema` in `server/utils/validators.ts` — Indonesian phone regex `/^(?:\+62|62|0)[2-9]\d{7,11}$/` for validation
- Stamp counter UI in `cashier/index.vue` lines 108-138 — +/- buttons with `stampCount` ref, reusable pattern

### Established Patterns
- Cashier page uses `state` ref (`'scan' | 'customer'`) for flow control — extend with phone lookup state
- Toast notifications for success/error feedback (`toast.add()`)
- `verifiedData` ref holds customer program data after verification — same pattern for phone lookup result
- Service client `getServiceClient(event)` for all DB operations in API routes

### Integration Points
- Replace `manualCode` input section (lines 34-43 in cashier/index.vue) with phone search input
- New API endpoint needed: `GET /api/customers/lookup?phone=...&business_id=...` to search by phone and return stamp programs
- `branchId` resolved from customer_program or from cashier's member scope — existing pattern in `verifyAndLoad()`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that match the existing cashier page patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-cashier-mode-add-stamp-manually*
*Context gathered: 2026-03-21*
