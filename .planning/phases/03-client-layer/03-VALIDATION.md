---
phase: 3
slug: client-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already installed) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DISP-01 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | DISP-02 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | DISP-03 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | DISP-04 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | AUTH-01 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | AUTH-02 | manual | Browser check | N/A | ⬜ pending |
| TBD | TBD | TBD | AUTH-03 | manual | Browser check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Phase 3 is primarily frontend UI — validation is manual browser-based verification against success criteria.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Members list shows email, display name, role, branch, active badge | DISP-01, DISP-02 | UI rendering + data display | Navigate to members page, verify all columns render correctly |
| Members list shows last login time | DISP-04 | UI rendering | Check relative time display in members list |
| Owner creates staff via form | DISP-03 | Form interaction + API call | Fill create form, submit, verify new row appears |
| Owner actions (deactivate, reactivate, reset password, reassign, delete) | DISP-03 | Dropdown menu interaction | Use per-row action controls, verify state changes |
| Staff login at /staff/login | AUTH-01 | Auth flow | Navigate to /staff/login, sign in with staff credentials |
| Role-based routing after login | AUTH-02, AUTH-03 | Auth redirect | Verify cashier → /cashier, admin → /dashboard/[slug] |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
