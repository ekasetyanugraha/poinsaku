# Requirements: PoinSaku — Staff Account Management

**Defined:** 2026-03-20
**Core Value:** Business owners can create and fully control staff accounts (admins and cashiers) without staff having self-service access to credentials.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Account Creation

- [x] **ACCT-01**: Owner can create a staff account with email and password
- [x] **ACCT-02**: Owner can set display name during staff account creation
- [x] **ACCT-03**: Owner can assign role (admin or cashier) during creation
- [x] **ACCT-04**: Owner can assign branch/business scope during creation

### Account Management

- [x] **MGMT-01**: Owner can reset a staff member's password
- [x] **MGMT-02**: Owner can deactivate a staff account (suspend login without deleting)
- [x] **MGMT-03**: Owner can reactivate a deactivated staff account
- [ ] **MGMT-04**: Owner can permanently delete a staff account
- [x] **MGMT-05**: Owner can reassign a staff member to a different branch

### Staff Display

- [ ] **DISP-01**: Members list shows email and display name instead of raw UUIDs
- [ ] **DISP-02**: Members list shows active/inactive status badge per member
- [ ] **DISP-03**: Members list shows role and branch scope per member
- [ ] **DISP-04**: Members list shows last login time per staff member

### Staff Authentication

- [ ] **AUTH-01**: Staff can log in via a separate dedicated login page
- [ ] **AUTH-02**: Staff are redirected based on role after login (cashier to /cashier, admin to /dashboard)
- [ ] **AUTH-03**: Staff cannot change their own passwords

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Creation UX

- **CUX-01**: Copy-once temporary password display in modal after creation
- **CUX-02**: Auto-generated strong password option (server generates instead of owner choosing)

### Staff Display

- **DISP-05**: Inline branch filter on staff list

### Audit

- **AUDT-01**: Staff activity audit trail (which cashier processed which transactions)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Staff self-service password reset | Owner controls all credentials — core security model |
| Staff self-registration / sign-up | Accounts are owner-created only |
| Email invitation links (magic links) | Owner creates accounts directly with full credentials |
| Multi-branch assignment | One branch per staff — simplicity constraint |
| Staff profile editing (name, avatar) | Not needed for this milestone |
| Custom roles / permission editor | Three roles (owner/admin/cashier) are sufficient |
| Two-factor authentication for staff | Overkill for POS cashier use case |
| SSO / enterprise identity provider | Not applicable for small-business target market |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | Phase 2 | Complete |
| ACCT-02 | Phase 2 | Complete |
| ACCT-03 | Phase 2 | Complete |
| ACCT-04 | Phase 2 | Complete |
| MGMT-01 | Phase 2 | Complete |
| MGMT-02 | Phase 2 | Complete |
| MGMT-03 | Phase 2 | Complete |
| MGMT-04 | Phase 2 | Pending |
| MGMT-05 | Phase 2 | Complete |
| DISP-01 | Phase 3 | Pending |
| DISP-02 | Phase 3 | Pending |
| DISP-03 | Phase 3 | Pending |
| DISP-04 | Phase 3 | Pending |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
