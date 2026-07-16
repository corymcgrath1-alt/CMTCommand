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
  - `apps/operational/src/server/db/schema/organizations.ts`
  - `apps/operational/src/server/db/schema/offices.ts`
  - `apps/operational/src/server/tenancy/scope.ts`
  - `apps/operational/src/server/tenancy/repository.ts`
  - `apps/operational/tests/integration/tenancy.integration.test.ts`
  - `apps/operational/src/server/auth/`
  - `apps/operational/src/server/members/`
  - `apps/operational/tests/unit/auth.*.test.ts`
  - `apps/operational/tests/integration/identity.integration.test.ts`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md`
  - `docs/cmtcommand-vnext/review.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-15

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

## Phase 5 Tenancy Foundation - Confirmed

Phase 5 implements application-layer organization and office scoping for office
persistence only:

- Offices require `organization_id`.
- Office codes are unique within an organization.
- Cross-organization office lookup returns the same public result as nonexistent
  lookup: `not_found_or_inaccessible`.
- Restricted office scopes with an empty office list return no offices and do
  not broaden to organization-wide access.
- Office identifiers cannot override the organization id in the supplied scope.
- PostgreSQL prevents offices from referencing nonexistent organizations.
- PostgreSQL prevents deleting an organization while it still owns offices.

Phase 5 itself is not a complete authorization system. Phase 5D now supplies
trusted scope for protected Operational vNext callers; setup-level tenancy
helpers remain internal.

## Phase 5D Identity, Session, And Authorization Boundary - Confirmed

Identity boundary:

- `users` are provider-independent application records.
- `external_identities` map a unique verified provider/subject to one user.
- Email is mutable contact/login metadata, not the immutable external identity
  key.
- Unknown identities are not automatically provisioned.
- User status must be `active`; invited, suspended, and disabled users fail closed.

Authentication provider boundary:

- No production provider is selected. `AUTH_MODE=disabled` is the default and
  protected production access fails closed.
- The development/test adapter requires an explicit allowlist and a minimum
  32-character signing secret.
- The adapter is rejected in staging, pilot-production, production, or a
  production Node runtime.
- No request header is accepted as identity, role, organization, office, or
  permission proof.
- No provider access/refresh token is stored or exposed.
- A future provider must validate issuer, audience, signature, expiration, and
  state/nonce as applicable before producing the existing verified identity type.

Session boundary:

- Development sessions are HMAC-SHA256 signed and use `HttpOnly`,
  `SameSite=Lax`, path-scoped cookies with an eight-hour maximum lifetime.
- The cookie contains provider, subject, issued/expiry times, and optional active
  organization only. It contains no application role or permission.
- Production provider cookies must use `Secure`; the current development adapter
  cannot execute in production.
- State-changing Phase 5D UI operations use Next.js Server Actions with
  same-origin action protection. Sensitive identity data is not placed in query
  strings or local storage.

Membership and active organization:

- Access requires active user, active organization, and active membership.
- Membership lifecycle is invited, active, suspended, or revoked.
- Users may have multiple organizations. The signed active-organization choice
  is revalidated against current membership on every request.
- Suspended/revoked membership, inactive organization, missing membership, or an
  invalid selection produces a controlled denied state.

Implemented role policy:

| Role | Current Phase 5D permission intent | Office policy |
| --- | --- | --- |
| Organization admin | Read organization/offices; list/manage members, roles, and office assignments. | `all` or `restricted` |
| Operations manager | Read current authorized organization/offices. | `all` or `restricted` |
| Dispatcher | Read current authorized organization/offices; no membership administration. | `restricted` only |
| Technical reviewer | Read current authorized organization/offices; no membership administration. | `all` or `restricted` |
| Field technician | Read current authorized organization/offices; no organization administration. | `restricted` only |
| Viewer | Read current authorized organization/offices; no writes. | `all` or `restricted` |

These permissions cover only implemented foundation surfaces. Readiness,
coverage, assignments, field reporting, and technical report approval remain
unimplemented and grant no current capability.

Server authorization requirements:

- Request scope follows verified identity -> application user -> active
  membership -> office scope -> permissions -> scoped operation.
- Client-supplied organization IDs, office IDs, roles, and permissions are always
  untrusted input.
- Cross-tenant office probes return `not_found_or_inaccessible` equivalence.
- Membership writes revalidate the acting user and membership inside the locked
  transaction, reject stale versions, prevent self role/status changes, protect
  the final active admin, and identify the actor in structured mutation metadata.
- Composite foreign keys prevent cross-organization office assignment.

Development/test identities include all six roles, suspended membership,
disabled user, no membership, one-office and multi-office scope, a second
organization, and a multi-organization user. They are seeded separately from
production migrations.

PostgreSQL RLS and persistent general audit events are not implemented. Mutation
metadata is preparation for a future audit sink, not an audit-history claim.
See [ADR-007](decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md).

## Pilot V1 Target Roles And Boundaries

| Role | Allowed actions | Denied / constrained actions |
| --- | --- | --- |
| Organization Admin | Manage users, assign roles, configure participating office, manage imports, review import failures. | No cross-organization access. |
| Operations Manager / Dispatcher | Review readiness, resolve issues, search coverage, propose assignments, approve ordinary coverage decisions, create Decision Log entries. | No organization-wide administration unless separately assigned. |
| CMT Manager / Branch Manager | Review office operations, approve significant operational changes, review impact and data-quality results. | Significant-change rules remain unresolved. |
| Project Manager | Review relevant projects/work orders, supply or correct project information, review affecting decisions. | No organization-wide administration unless separately assigned another role. |
| Executive / Read Only | Review readiness, trends, and impact summaries. | Cannot alter assignments or operational records. |

The implemented field-technician role is a forward-compatible restricted role;
it does not imply Field Operations or technician-assignment functionality exists.

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

- Root demo Settings copy and role state remain non-authoritative demo behavior;
  the Operational vNext permission module is the enforced server boundary.
- Browser/CDP security validation is not part of normal CI.
- Production authentication, invitation delivery, audit storage, and provider
  secret operations remain target requirements. Foundation RBAC is implemented
  only for current identity/member/office surfaces.
- Phase 5D proves isolation for identity, membership, office assignment, member
  administration, and office reads, not for future Pilot V1 domain tables.
- Operational vNext health endpoints exist, but they are not authenticated and do not prove tenant isolation or pilot readiness.

## Open Questions

- [OPEN QUESTION - High Impact] Which exact managed authentication provider should replace the disabled production boundary and implement invite-only access?
- [OPEN QUESTION - High Impact] What approval rules define significant operational changes?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to customer data and Decision Log entries?
- [OPEN QUESTION - Medium Impact] What logging policy safely supports troubleshooting without exposing pilot data?
- [OPEN QUESTION - Medium Impact] Can Project Managers directly edit imported records, or only propose corrections?
