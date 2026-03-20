---
phase: 2
slug: server-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (needs install — Wave 0) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ACCT-01,02,03,04 | integration | `npx vitest run server/api/staff` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | MGMT-01 | integration | `npx vitest run server/api/staff` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | MGMT-02,03 | integration | `npx vitest run server/api/staff` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | MGMT-04 | integration | `npx vitest run server/api/staff` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | MGMT-05 | integration | `npx vitest run server/api/staff` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest as dev dependency
- [ ] Create vitest.config.ts
- [ ] Stub test files for staff endpoint schemas (Zod validation tests)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ban/unban hits Supabase Auth API | MGMT-02,03 | Requires live Supabase connection | Call PUT /api/staff/[id]/status, verify auth user ban state in Supabase dashboard |
| Auth user deletion frees email | MGMT-04 | Requires live Supabase connection | DELETE staff, then POST create with same email — should succeed |
| Deactivated staff gets 403 immediately | MGMT-02 | Requires live request with deactivated user token | Deactivate user, immediately call any protected endpoint with their session |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
