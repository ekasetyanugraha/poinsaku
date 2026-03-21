---
phase: 4
slug: cashier-mode-add-stamp-manually
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | normalizePhone coverage | unit | `npm test` | W0 | pending |
| 04-01-02 | 01 | 1 | customerLookupSchema + stampPreview | unit | `npm test` | W0 | pending |
| 04-02-01 | 02 | 2 | phone lookup script logic + redemption guard | integration | `npm test` | N/A | pending |
| 04-02-02 | 02 | 2 | phone search template + program picker + amount input | manual | visual check | N/A | pending |
| 04-02-03 | 02 | 2 | end-to-end phone lookup verification | manual | visual check | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/validators.test.ts` — add `normalizePhone` test coverage
- [ ] `tests/unit/validators.test.ts` — add `customerLookupSchema` tests once schema is created
- [ ] `tests/unit/stamp-preview.test.ts` — pure function test for `Math.floor(amount / amountPerStamp)` edge cases

*Existing infrastructure partially covers phase requirements — `phoneSchema` tests already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phone search UI replaces manualCode section | Page integration | Visual layout change | 1. Open /cashier 2. Verify phone input below QR scanner 3. Verify no "masukkan kode manual" section |
| Multi-program picker display | UX flow | Interactive UI state | 1. Lookup customer with 2+ stamp programs 2. Verify program list displays 3. Select one, verify customer view loads |
| Amount-based stamp preview | Real-time calculation | Client-side computed display | 1. Select amount_based program 2. Enter Rp amount 3. Verify "= N stempel" preview updates live |
| Full reset after stamp add | Post-action cleanup | End-to-end state reset | 1. Complete stamp add via phone lookup 2. Verify return to scan state 3. Verify phone input cleared |
| Redemption hidden for phone lookup | Security constraint | UI guard behavior | 1. Lookup customer via phone with redeemable stamps 2. Verify Tukarkan Hadiah button NOT shown 3. Scan same customer via QR 4. Verify Tukarkan Hadiah button IS shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
