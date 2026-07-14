# Security Privacy And Permissions

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `AGENTS.md`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `app.js`
  - `demoShared.js`
  - `pilotIntakeSafety.js`
  - `demoControlCenter.js`
  - `tests/pilotIntakeSafety.test.js`
  - `tests/demoShared.test.js`
  - `apps/operational/.env.example`
  - `apps/operational/src/lib/env/server.ts`
  - `apps/operational/src/app/api/ready/route.ts`
  - `apps/operational/src/server/db/check.ts`
  - `docs/cmtcommand-vnext/review.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

## Current Demo - Confirmed

Authentication:

- No root authentication mechanism was found.

Session handling:

- No server session exists.
- Browser localStorage is used for display/demo state.

Authorization:

- `app.js` has role-based UI access lists.
- No server-enforced authorization boundary was found.
- Role selector is not a security control.

Tenant/customer data isolation:

- No tenant, organization, office, or customer data model was found.

Secret management:

- No root env example or secret-management config was found.
- vNext verification records a secret scan with expected false positives only.

Input validation and file handling:

- Pilot Setup CSV parsing/validation is implemented in `pilotIntakeSafety.js`.
- Oversized CSV input is blocked before read.
- Malformed CSV is blocked.
- Missing required columns block Apply Import.
- User-controlled CSV/document text must render as text.
- CSV export neutralizes spreadsheet formula-leading values.

Sensitive data:

- README and pilot materials explicitly exclude payroll, pricing, HR notes, sensitive personal data, and real credentials from pilot requirements.

Destructive operations:

- No product destructive backend operations were found.
- Demo reset is intended to clear only known demo state keys.

## Founder Decision - 2026-07-13

Pilot V1 must be invite-only, organization-scoped, initially limited to one participating firm and office, architected for later multi-organization isolation, role-based, and auditable.

All reads and writes must be scoped to the authenticated organization and, where applicable, office.

Corrections to the Decision Log must preserve the original action and add an auditable correcting entry rather than erasing history.

## Architecture Selection - 2026-07-13

Operational vNext should use a managed authentication provider for identity and app-owned server-side authorization for organization memberships, office scope, role assignments, permission checks, Decision Log behavior, and audit events.

Authorization must be declared in a central policy module, reused by Server Components, Server Actions, Route Handlers, and service methods, and tested with allowed and denied cases. Client-side route guards and hidden buttons are UX hints only.

See [ADR-004 Tenancy Authorization And Audit Model](decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md).

## Phase 4 Scaffold - Confirmed

Operational vNext now has server-side environment validation, blank
environment placeholders, lazy database connection wiring, and health responses
that avoid returning database URLs, raw driver errors, hostnames, stack traces,
or secrets.

Phase 4 did not implement authentication, authorization, organization/office
scoping, audit events, Decision Log entries, user accounts, invitations, or
permission enforcement.

## Pilot V1 Target Roles And Boundaries

| Role | Allowed actions | Denied / constrained actions |
| --- | --- | --- |
| Organization Admin | Manage users, assign roles, configure participating office, manage imports, review import failures. | No cross-organization access. |
| Operations Manager / Dispatcher | Review readiness, resolve issues, search coverage, propose assignments, approve ordinary coverage decisions, create Decision Log entries. | No organization-wide administration unless separately assigned. |
| CMT Manager / Branch Manager | Review office operations, approve significant operational changes, review impact and data-quality results. | Significant-change rules remain unresolved. |
| Project Manager | Review relevant projects/work orders, supply or correct project information, review affecting decisions. | No organization-wide administration unless separately assigned another role. |
| Executive / Read Only | Review readiness, trends, and impact summaries. | Cannot alter assignments or operational records. |

Field technicians do not need to be full application users in Pilot V1.

## Data Minimization - Pilot V1 Target

Pilot V1 may collect only business-operational information required for readiness and coverage.

Allowed examples:

- Business name.
- Internal employee identifier.
- Work email.
- Work phone.
- Office.
- Operational role.
- Work availability.
- Certifications.
- Clearance status.
- Assigned work.
- Work-hours operational status.
- Equipment assignments.

Forbidden or excluded:

- Social Security numbers.
- Dates of birth.
- Home addresses.
- Banking information.
- Payroll data.
- Medical information.
- Disability information.
- Immigration documents.
- Full background-investigation reports.
- Personal disciplinary notes.
- Personal phone numbers without explicit opt-in.
- Precise after-hours location.
- After-hours location history.
- Unnecessary driver's-license details.
- Customer documents unrelated to readiness.
- Passwords, tokens, API keys, or other credentials inside imported files.

The demo must continue to use fictional or anonymized data. Pilot import validation must identify prohibited or unexpected sensitive columns rather than silently ingesting them.

## Security-Sensitive Contradictions Or Gaps

- Settings UI copy mentions permissions and future integrations, but no real permission system or integration layer exists.
- Role access exists in UI state, but no auth service makes it enforceable.
- Browser/CDP security validation is not part of normal CI.
- Pilot V1 auth, authorization, tenant isolation, audit storage, and secret handling are target requirements, not current implementation.
- Operational vNext health endpoints exist, but they are not authenticated and do not prove tenant isolation or pilot readiness.

## Open Questions

- [OPEN QUESTION - High Impact] Which exact managed authentication provider should implement invite-only Pilot V1 access?
- [OPEN QUESTION - High Impact] What approval rules define significant operational changes?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to customer data and Decision Log entries?
- [OPEN QUESTION - Medium Impact] What logging policy safely supports troubleshooting without exposing pilot data?
- [OPEN QUESTION - Medium Impact] Can Project Managers directly edit imported records, or only propose corrections?
