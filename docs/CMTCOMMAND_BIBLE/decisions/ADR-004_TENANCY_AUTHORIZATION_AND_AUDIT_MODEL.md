# ADR-004 Tenancy Authorization And Audit Model

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
  - `docs/CMTCOMMAND_BIBLE/03_USERS_ROLES_AND_WORKFLOWS.md`
  - `docs/CMTCOMMAND_BIBLE/09_SECURITY_PRIVACY_AND_PERMISSIONS.md`
  - `docs/CMTCOMMAND_BIBLE/specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md`
- Last Reviewed: 2026-07-13

## Decision

Operational vNext should use managed authentication for user identity and app-owned authorization for CMTCommand memberships, roles, organization scope, office scope, Decision Log behavior, and audit history.

Authorization is server-enforced. UI route guards and hidden buttons may improve user experience, but they are never the security boundary.

## Authentication Boundary

The authentication provider proves user identity and session state. CMTCommand then maps the authenticated identity to an internal user and membership record.

Provider selection remains a production-deployment checkpoint. The architecture requires:

- Invite-only onboarding.
- Stable external identity id.
- Session verification in server-side request context.
- Ability to disable access.
- Protected secrets.
- Support for development, staging, and pilot-production environments.

## Organization Membership

Every authenticated user who can access pilot data must have at least one organization membership.

Membership should include:

- Internal user id.
- Organization id.
- Status such as invited, active, disabled.
- Role assignments.
- Optional office scope.
- Audit timestamps.

## Office Scope

Pilot V1 starts with one office, but data model and query policy must support:

- Organization-wide users.
- Office-limited users.
- Project-limited visibility where applicable.
- Additional offices later.
- Additional organizations later.

Office scope applies where data is office-owned: technicians, equipment, work orders, imports, readiness snapshots, decisions, and operational impact.

## Role Definitions

| Role | Core capabilities | Constraints |
| --- | --- | --- |
| Organization Admin | Manage users, assign roles, configure office, manage imports, review import failures. | No cross-organization access. |
| Operations Manager / Dispatcher | Review readiness, investigate issues, search coverage, propose assignments, approve ordinary coverage, create Decision Log entries. | Significant-change approval may require manager role. |
| CMT Manager / Branch Manager | Review office-wide operations, approve significant operational changes, review impact and data-quality results. | No tenant administration unless also admin. |
| Project Manager | Review relevant projects/work orders, supply or correct project information, review decisions affecting assigned projects. | No organization-wide administration unless separately assigned. |
| Executive / Read Only | Review readiness, trends, and operational-impact summaries. | Cannot change assignments or operational records. |

## Role-Capability Matrix

| Capability | Org Admin | Ops Manager / Dispatcher | CMT / Branch Manager | Project Manager | Executive / Read Only |
| --- | --- | --- | --- | --- | --- |
| Manage users and roles | Allow | Deny | Deny unless separately assigned | Deny | Deny |
| Configure participating office | Allow | Deny | Review only | Deny | Deny |
| Manage imports | Allow | Allow for assigned office | Review import quality | Deny unless delegated | Review only |
| Review readiness | Allow | Allow | Allow | Project-scoped allow | Allow |
| Investigate readiness issues | Allow | Allow | Allow | Project-scoped allow | Review only |
| Search coverage | Allow | Allow | Allow | Deny unless delegated | Deny |
| Propose assignments | Allow | Allow | Allow | Project correction only | Deny |
| Approve ordinary coverage | Allow | Allow | Allow | Deny | Deny |
| Approve significant coverage | Allow | Deny unless separately granted | Allow | Deny | Deny |
| Create Decision Log entry | Allow | Allow | Allow | Project correction/comment only | Deny |
| Correct Decision Log entry | Append correction only | Append correction only | Append correction only | Append project correction only | Deny |
| View operational impact | Allow | Allow | Allow | Project-scoped allow | Allow |
| View audit events | Allow | Deny unless delegated | Review summary | Deny | Deny |

## Permission Evaluation

Authorization should be declared in a central policy module. Each policy check should accept:

- Actor identity.
- Organization id.
- Office id when applicable.
- Resource type.
- Resource id or scope.
- Action.
- Current role/membership facts.
- Optional project relationship.

Server code should call policy helpers before reads and writes. Data-access helpers must also require organization and office scope so callers cannot accidentally run unscoped queries.

## Data-Query Scoping

Every tenant-owned table should include `organization_id`. Office-owned records should also include `office_id`.

Selected enforcement model:

- Application-layer query construction is mandatory from the first implementation.
- Database constraints and foreign keys are mandatory once schemas exist.
- PostgreSQL row-level security should be evaluated and, if compatible with the selected deployment/runtime connection model, enabled before pilot production as defense-in-depth.

This is not a claim that isolation is implemented or guaranteed.

## Server-Side Enforcement

Authorization checks must happen in:

- Server Components before reading scoped data.
- Server Actions before mutation.
- Route Handlers before imports, health details, or API responses.
- Service-layer methods that can be called by more than one route/action.

Do not rely on:

- Hidden buttons.
- Client-only route guards.
- Middleware/proxy as the only gate.
- User-submitted organization or office ids without server-side membership checks.

## Audit-Event Model

System audit events record security-relevant and operational-system actions, such as:

- User invited.
- Role assigned or removed.
- Login/session event where provided safely by auth integration.
- Import received, validated, confirmed, processed, failed, or cancelled.
- Authorization denial for sensitive action.
- Readiness snapshot created.
- Coverage proposal created.
- Coverage decision approved.
- Decision correction appended.
- Health/recovery operations when relevant.

Audit events should include safe identifiers, not raw import rows or forbidden sensitive data.

## Decision Log Distinction

Business Decision Log entries are not the same as system audit events.

- Decision Log: business-visible operational decisions, corrections, rationale, affected work orders, approval context.
- Audit events: security/system trace of who did what and when, including denied actions and system events.
- Readiness snapshots: deterministic evaluation outputs.
- Current operational state: mutable projection of latest assignments/statuses.

These records may relate to each other but should not be collapsed into one table without a later schema decision.

## Correction Behavior

Corrections must create a new entry referencing the original entry. Do not erase or silently mutate historical decisions.

Correction entries should indicate:

- Correcting actor.
- Original decision id.
- Reason.
- Superseded or corrected fields.
- New effective interpretation.
- Timestamp.

## Cross-Organization Isolation

No user may read, write, import, approve, audit, or search coverage across organizations unless a later explicit platform-admin capability is designed and approved. Pilot V1 does not require platform-admin customer support access.

## Test Requirements

- Permission matrix tests for every role and major capability.
- Denied-case tests for every allowed action.
- Organization isolation tests with two organizations.
- Office isolation tests with at least two offices in one organization.
- Project-scoped Project Manager visibility tests.
- Import ownership tests.
- Decision Log correction tests.
- Audit-event creation tests for sensitive actions.
- Tests that UI-hidden controls are not required for denial.

## Administrator Risks

Organization Admin can create high-impact changes. Admin actions require audit events and, where practical, confirmation for role changes and import execution.

## Future Multi-Office Implications

Coverage searches may eventually cross office boundaries. Pilot V1 must record whether a recommendation is within-office or cross-office and must not assume cross-office coverage is always allowed.

## Future Multi-Organization Implications

All design should support multiple organizations later, but Pilot V1 does not need cross-organization sharing, marketplace coverage, or partner-firm identity federation.

## Known Unresolved Decisions

Phase 5D implements the internal user, provider identity, organization
membership, office assignment, centralized permission, and protected-request
foundation described here. [ADR-007](ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md)
records the concrete server-derived scope decision. Production authentication,
invitation delivery, persistent audit events, and RLS remain unresolved.

- Exact managed authentication provider.
- Whether RLS is enabled in Phase 4 or later pre-production hardening.
- Exact approval threshold for significant coverage changes.
- Whether Project Managers can directly edit imported records or only submit corrections.
- Whether office boundaries restrict coverage recommendations by default.

## Open Questions

- [OPEN QUESTION - High Impact] Which managed authentication provider should replace the disabled production boundary before pilot deployment?
- [OPEN QUESTION - High Impact] What approval threshold distinguishes ordinary from significant coverage decisions?
- [OPEN QUESTION - Medium Impact] Should PostgreSQL RLS be mandatory before first pilot production, or accepted as post-scaffold hardening?
- [OPEN QUESTION - Medium Impact] Can Project Managers directly edit imported records, or only submit corrections?
