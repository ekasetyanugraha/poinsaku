# Codebase Concerns

**Analysis Date:** 2026-03-20

## Tech Debt

**Widespread untyped Supabase query casts:**
- Issue: Supabase queries cast responses to inline typed interfaces (e.g., `as { id: string; business_id: string; type: string }`) throughout the codebase instead of using a centralized type system or database-generated types.
- Files: `server/api/transactions/stamp.post.ts` (line 21), `server/api/transactions/cashback.post.ts` (line 21), `server/api/transactions/redeem-cashback.post.ts` (line 21), `server/api/transactions/redeem-stamps.post.ts` (line 21), `server/api/transactions/upgrade-tier.post.ts` (line 21), `server/api/members/index.get.ts` (line 26-27), `server/api/vouchers/generate.post.ts` (line 43)
- Impact: Type mismatches become invisible at runtime, leading to silent data corruption if schema changes. Adding new fields to queries requires manual type updates in multiple endpoints.
- Fix approach: Generate types from database schema (supabase gen types) and create type-safe wrapper functions that return properly typed Supabase queries. Gradually replace inline casts with generated types from `app/types/database.types.ts`.

**No transaction rollback mechanism for multi-step operations:**
- Issue: Financial and state-altering operations (stamp/cashback earning and redemption, tier upgrades) perform multiple sequential database updates without transaction boundaries or rollback on partial failure.
- Files: `server/api/transactions/stamp.post.ts` (steps 7-8 separated), `server/api/transactions/cashback.post.ts` (steps 4-8 separated), `server/api/vouchers/generate.post.ts` (steps 3-8 across lines 98-161)
- Impact: If a transaction insert fails after state update, customer balances become inconsistent with transaction history. If tier upgrade status update fails but transaction succeeds, audit trail doesn't match actual state.
- Fix approach: Wrap multi-step operations in a single Supabase transaction or stored procedure. For customer balance updates followed by transaction inserts: use `--check-constraints` or store procedures to ensure atomicity.

**Race condition in concurrent stamp/cashback operations:**
- Issue: Stamp and cashback earning read current balance, calculate new balance, then update. No pessimistic locking or version checks prevent concurrent requests from overwriting each other.
- Files: `server/api/transactions/stamp.post.ts` (lines 66-88), `server/api/transactions/cashback.post.ts` (lines 30-73), `server/api/transactions/redeem-stamps.post.ts` (lines 43-75)
- Impact: In high-concurrency scenarios (multiple staff adding stamps simultaneously), customer balances can be lost. Example: two requests read balance=10, both add 5, both write 15 instead of 20.
- Fix approach: Use Supabase optimistic locking (add `version` column, include in WHERE clause), or use database triggers with versioning. Alternative: implement distributed locks via Redis or Supabase realtime.

**QR token reuse protection insufficient:**
- Issue: Voucher generation checks if QR token is already used (line 28 in `vouchers/generate.post.ts`), but window exists between check and mark-as-used where same token could generate multiple vouchers concurrently.
- Files: `server/api/vouchers/generate.post.ts` (lines 24-29, 157-159)
- Impact: Customers can generate multiple vouchers from single QR code if two requests arrive simultaneously during staff transaction flow.
- Fix approach: Use database-level constraint or trigger: set `is_used` as part of update statement with version/timestamp check, or use Supabase row-level policies with atomic updates.

**No enforcement of tier rank uniqueness within programs:**
- Issue: Tier ranks are assigned client-side with manual increment; no database constraint prevents duplicate ranks or gaps in a program's tier hierarchy.
- Files: `app/pages/dashboard/[businessSlug]/programs/new.vue` (line 109 - manual rank assignment in removeTier), `server/api/programs/index.post.ts` (tiers inserted without uniqueness validation)
- Impact: Tier upgrade logic iterates through tiers ordered by rank DESC (line 105-110 in `cashback.post.ts`). Duplicate ranks cause unpredictable tier selection during auto-upgrade.
- Fix approach: Add unique constraint `(program_id, rank)` at database level. Update tier endpoints to validate rank uniqueness before insert/update.

**Unvalidated scope_id for branch-scoped resources:**
- Issue: When creating branch-scoped programs or voucher options, client sends `scope_id` which is only loosely validated against branch existence.
- Files: `server/api/programs/index.post.ts`, `server/api/voucher-options/index.post.ts` - accept `scope_id` without explicit branch ownership verification
- Impact: Malicious actor could create programs or voucher options for branches they don't have access to if they know the branch UUID.
- Fix approach: In all endpoints accepting `scope_id`: fetch the branch, verify `business_id` matches the business from requireMember, then use that verified ID.

## Security Considerations

**Staff credentials stored without hashing in password reset flow:**
- Risk: Password reset (`server/api/staff/[id]/password.put.ts`) and creation flow (`server/api/staff/index.post.ts`) rely entirely on Supabase auth. If Supabase connection is compromised or credentials are logged, plaintext passwords could be exposed during transmission.
- Files: `server/api/staff/index.post.ts` (line 8-16), `server/api/staff/[id]/password.put.ts` (line 8-13)
- Current mitigation: Zod validation enforces 8+ characters with mixed case/number. Supabase handles auth at HTTP layer with HTTPS.
- Recommendations: Add rate limiting on password endpoints. Log password changes with hash of old password, not plaintext. Consider adding TOTP 2FA for admin/owner accounts.

**Branch membership assignment doesn't validate scope_type transitions:**
- Risk: Reassign branch endpoint accepts any `scope_type` (business or branch). Admin could accidentally downscope a user from business-wide admin to single branch, or upscope a cashier without authorization.
- Files: `server/api/staff/[id]/branch.put.ts` (line 44-80 allows arbitrary scope_type changes)
- Current mitigation: Role-based access control checks if requester is owner/admin.
- Recommendations: Add explicit validation: only allow scope_type downgrades (business → branch), never upgrades. Require owner approval for upscopes.

**Missing rate limiting on transaction endpoints:**
- Risk: Stamp/cashback endpoints accept unlimited requests. Malicious actor could flood the system with artificial stamp additions/redemptions.
- Files: `server/api/transactions/stamp.post.ts`, `server/api/transactions/cashback.post.ts`, `server/api/transactions/redeem-stamps.post.ts`, `server/api/transactions/redeem-cashback.post.ts`
- Current mitigation: Only authenticated staff can call these endpoints (requireMember check).
- Recommendations: Implement per-endpoint rate limiting (e.g., 100 transactions/min per staff member). Add idempotency keys to prevent double-charging.

**Customer program join endpoint has no fraud detection:**
- Risk: Customer can join any program if they know the program ID. No limits on multi-join or bulk joining.
- Files: `server/api/customers/register.post.ts`
- Current mitigation: Program ID is partially disclosed on public landing pages.
- Recommendations: Add captcha on public join flow. Implement duplicate detection (phone + program_id should be unique). Add fraud scoring based on registration velocity.

## Performance Bottlenecks

**N+1 query in members list endpoint:**
- Problem: Members list fetches all branches for the business, then constructs an OR query string. For each API call, branches are queried separately.
- Files: `server/api/members/index.get.ts` (lines 8-31)
- Cause: Branches are fetched separately from members. With many branches, the OR clause becomes massive and inefficient.
- Improvement path: Join members with branches table directly. Or cache branch IDs in business-scoped query if many branches.

**Auto-tier-upgrade logic loads all tiers on every transaction:**
- Problem: Cashback earning endpoint loads all tiers, filters, then tries to upgrade. On membership programs with 20+ tiers, this adds 1-2 extra queries per transaction.
- Files: `server/api/transactions/cashback.post.ts` (lines 101-165)
- Cause: No indexed query for "next qualifying tier." Logic iterates in application code instead of database.
- Improvement path: Create trigger/stored procedure that auto-upgrades at database level. Query only for next eligible tier using indexed queries (rank > current_rank AND threshold <= new_total_spend).

**Supabase RLS recalculation on every staff action:**
- Problem: Staff endpoints call requireMember for every request, which queries branches and members tables fresh.
- Files: Most endpoints in `server/api/staff/` and `server/api/transactions/`
- Cause: No caching of membership resolution. Business_id is re-fetched from member record every time.
- Improvement path: Cache member access info in request context or Redis (5-minute TTL). Or defer to database-level RLS instead of application-level checks where possible.

## Fragile Areas

**Members list query construction with string interpolation:**
- Files: `server/api/members/index.get.ts` (lines 25-28)
- Why fragile: OR query is built by concatenating strings: `and(scope_type.eq.business,scope_id.eq.${businessId})`. If branch IDs contain special characters or if format changes, query fails silently.
- Safe modification: Use Supabase's `.or()` helper properly. Create multiple queries and merge results in application code instead of building PostgREST filter strings manually.
- Test coverage: No tests for multi-branch member queries.

**Tier upgrade auto-logic with manual rank assignment:**
- Files: `app/pages/dashboard/[businessSlug]/programs/new.vue` (line 104), `server/api/transactions/cashback.post.ts` (line 114-165)
- Why fragile: Tiers loop with `rank <= currentTier.rank` check. If UI creates duplicate ranks, or if ranks aren't sequential, the loop can skip tiers or upgrade to wrong tier.
- Safe modification: Enforce rank uniqueness in database (unique constraint). Test tier upgrade logic with non-sequential ranks.
- Test coverage: No tests for tier upgrade scenarios.

**Voucher expiry calculation in application code:**
- Files: `server/api/vouchers/generate.post.ts` (line 111)
- Why fragile: Expiry calculated as `Date.now() + voucherOption.expiry_days * 24 * 60 * 60 * 1000`. Timezone mismatches or clock skew between client and server could cause off-by-one expiry errors.
- Safe modification: Calculate expiry on server with server time only. Use database `CURRENT_TIMESTAMP` for expiry checks, not JavaScript Date.
- Test coverage: No tests for expiry boundary conditions.

**Type safety in composables using untyped responses:**
- Files: `app/composables/useAuth.ts` (line 13-14 use `as any`), `app/pages/dashboard/[businessSlug]/programs/[id].vue` (line 17 casts branch as `any`)
- Why fragile: Using `as any` bypasses TypeScript checks. If API response shape changes, UI crashes at runtime with no warning.
- Safe modification: Generate client types from API response schemas. Use Zod parsing on composable responses.
- Test coverage: No unit tests for composables.

## Scaling Limits

**Supabase query patterns not optimized for large programs:**
- Current capacity: Handles ~1000 customers per program without noticeable lag
- Limit: When programs reach 10k+ customers, member status checks (requireMember) and member list queries become slow
- Scaling path: Add database indexes on (auth_user_id, scope_id), (program_id, scope_type). Consider denormalizing member counts at business level.

**Real-time updates on transactions table:**
- Current capacity: Single business can handle 100 transactions/sec
- Limit: Supabase Realtime watchers scale linearly with subscribers. 1000+ concurrent staff on same business will cause realtime performance degradation.
- Scaling path: Move to application-level event bus (Redis pubsub) or websocket server. Or implement server-sent events (SSE) instead of polling.

**QR code generation for large programs:**
- Current capacity: Program QR codes are static. Can generate 1000s without issue.
- Limit: Dynamic/rotating QR tokens for abuse prevention are stored in qr_tokens table. If generating new token per stamp action, table grows unbounded.
- Scaling path: Use time-based token rotation (5-minute tokens) with automatic cleanup. Or implement token pagination/archival.

## Missing Critical Features

**No idempotency keys for transaction endpoints:**
- Problem: Double-submission of stamp/cashback endpoints will create duplicate transactions instead of returning cached response
- Blocks: Reliable mobile offline-first implementations. Network retries will double-charge customers.
- Ideal: Add `idempotency_key` parameter to all transaction endpoints. Check if key exists in transaction_metadata table before processing.

**No audit trail for membership changes:**
- Problem: When member is deactivated/reactivated or scope reassigned, no record of who made the change or when.
- Blocks: Compliance/forensics investigations. Can't determine if business owner was hacked.
- Ideal: Create `member_audit_log` table. Log create/update/delete with actor, timestamp, and before/after state.

**No bulk operations for staff/member management:**
- Problem: Importing 100 staff members requires 100 individual POST requests
- Blocks: Efficient onboarding of large organizations
- Ideal: Create batch endpoints for staff creation/tier assignment using CSV or JSON array.

## Test Coverage Gaps

**Transaction endpoints untested for concurrency:**
- What's not tested: Race conditions between concurrent stamp adds, concurrent cashback redemptions, concurrent tier upgrades
- Files: `server/api/transactions/stamp.post.ts`, `server/api/transactions/cashback.post.ts`, `server/api/transactions/redeem-stamps.post.ts`, `server/api/transactions/redeem-cashback.post.ts`, `server/api/transactions/upgrade-tier.post.ts`
- Risk: Data inconsistency bugs only surface in production under real load. Could silently lose customer balances.
- Priority: High - run concurrency tests before shipping to production

**Member authorization edge cases untested:**
- What's not tested: Branch-scoped members querying business-scoped endpoints, scope transitions, inactive member access
- Files: `server/utils/auth.ts` (requireMember function), all transaction endpoints using it
- Risk: Authorization bypass if edge case exists. Cashiers from Branch A could manipulate customers from Branch B.
- Priority: High

**UI form validation mismatches:**
- What's not tested: Client-side Zod schemas in Vue components don't match server-side schemas
- Files: `app/pages/dashboard/[businessSlug]/programs/new.vue` (tierSchema, main schema), `server/utils/validators.ts` (stampConfigSchema, etc.)
- Risk: UI accepts data that server rejects, or vice versa. User confusion.
- Priority: Medium

**Tier upgrade logic with edge-rank tiers untested:**
- What's not tested: Auto-upgrade with duplicate ranks, missing rank 0, rank 999, single-tier programs
- Files: `server/api/transactions/cashback.post.ts` (line 101-165)
- Risk: Tier logic breaks when tiers don't follow expected pattern
- Priority: Medium

---

*Concerns audit: 2026-03-20*
