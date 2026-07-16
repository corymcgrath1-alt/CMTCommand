# Data Model And Integrations

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `app.js`
  - `pilotIntakeSafety.js`
  - `operationalCompression.js`
  - `operationalImpact.js`
  - `demoControlCenter.js`
  - `tests/pilotIntakeSafety.test.js`
  - `tests/operationalImpact.test.js`
  - `apps/operational/drizzle.config.ts`
  - `apps/operational/src/server/db/`
  - `apps/operational/src/server/tenancy/`
  - `apps/operational/drizzle/0000_open_giant_girl.sql`
  - `apps/operational/drizzle/0001_office-composite-key.sql`
  - `apps/operational/drizzle/0002_identity-membership-rbac.sql`
  - `apps/operational/src/server/db/schema/users.ts`
  - `apps/operational/src/server/db/schema/external-identities.ts`
  - `apps/operational/src/server/db/schema/organization-memberships.ts`
  - `apps/operational/src/server/db/schema/office-assignments.ts`
  - `apps/operational/tests/integration/tenancy.integration.test.ts`
  - `README.md`
  - `docs/cmtcommand-vnext/plan.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-15

## Current Demo - Confirmed

No root database schemas, migrations, ORM models, seed files, or backend data services were found. Current data is JavaScript demo data and browser-local/session state.

Core in-memory/demo entities in `app.js` include:

- Technicians.
- Work orders/readiness jobs.
- Equipment.
- Projects and preview records.
- Coverage candidates.
- Decision Log entries.
- Pilot requests.
- Pilot scorecard state.
- Pilot Setup import previews and document metadata.

## Current Import Entities

`app.js` defines `intakeEntityConfig` for:

- `technicians`
- `certifications`
- `equipment`
- `workorders`
- `partners`
- `projects`

Each import entity has required columns and demo rows. `pilotIntakeSafety.validateImport` evaluates required columns, row warnings, duplicate warnings, parse errors, and blocked state.

## Current Identifiers And State

Confirmed identifiers include work order IDs such as `TRD-104`, technician IDs, equipment IDs, project names/numbers, and generated local decision IDs.

Confirmed localStorage keys:

- `cmtcommand-ui-mode`
- `cmtcommand-theme`
- `cmtcommand-demo-walkthrough`
- `cmtcommand-demo-control-checklist`

## Current Data Lifecycle

- Static demo data is created in `app.js` at page load.
- Pilot Setup CSV input is read locally through `FileReader`.
- Valid/acceptable imports can be applied to browser session state but do not overwrite the sample source arrays.
- Staged document metadata is browser session state.
- Demo reset clears known demo state keys only.
- CSV export uses generated `blob:` URLs and formula-safe CSV serialization.

## Founder Decision - 2026-07-13

During Pilot V1, the customer's existing scheduling, work-order, personnel, certification, and equipment systems remain authoritative for underlying operational records.

Potential source systems may include customer spreadsheets, scheduling exports, MetaField, QEST, LASTRADA, OpenGround, BoreDM, or AASHTOWare Project C&M. These products are not confirmed current integrations unless repository evidence is later added.

Pilot V1 should use controlled CSV/XLSX imports rather than deep real-time integrations.

CMTCommand becomes authoritative only for:

- Generated readiness snapshots.
- Detected readiness issues.
- Coverage recommendations.
- Approved coverage decisions.
- Decision history.
- Recorded pilot-impact measurements.

CMTCommand must not silently write changes back to external source systems in Pilot V1.

## Pilot V1 Target Data Domains

Required input domains:

- Technician roster.
- Technician availability.
- Certifications and expiration dates.
- Security-clearance requirements and statuses.
- Equipment inventory.
- Equipment availability.
- Calibration status and expiration dates.
- Service-type requirements.
- Upcoming work orders.
- Relevant projects and job sites.
- Assignment data.

Required CMTCommand-owned records:

- Import batches and validation results.
- Readiness snapshots.
- Rule-evaluation results.
- Critical action queue items.
- Coverage candidates and recommendations.
- Approved coverage decisions.
- Cascading-impact records.
- Decision Log entries and corrections.
- Data-quality reports.
- Pilot operational-impact snapshots.

## Relationships And Integrity - Pilot V1 Target

The operational model must relate:

- Organizations to offices, users, imports, and decisions.
- Offices to technicians, equipment, work orders, users, and readiness snapshots.
- Work orders to projects, job sites, service requirements, assigned technicians, required equipment, readiness issues, and decisions.
- Technicians to availability, certifications, clearances, assignments, and coverage eligibility.
- Equipment to availability, calibration records, assignments, and service requirements.
- Decisions to actor, organization, office, previous and proposed state, affected work orders, approvals, corrections, and timestamps.

Do not claim database-level enforcement until schemas and constraints exist.

## Architecture Selection - 2026-07-13

Operational vNext should use PostgreSQL or a PostgreSQL-compatible managed relational database with Drizzle ORM and Drizzle Kit migrations. Database rows are persistence models, not the complete domain model.

The conceptual data model in [Operational vNext Architecture Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md) identifies the required entities, ownership boundaries, identifiers, mutable versus append-only behavior, source-system identifiers, audit requirements, and retention implications.

Internal primary keys should be stable internal identifiers. Customer source-system identifiers and human-readable operational numbers such as `TRD-104` should be stored separately and must not be the sole database primary key.

## Phase 4 Scaffold - Confirmed

`apps/operational/` configures Drizzle Kit and a lazy Drizzle/PostgreSQL client
using `pg`. Phase 4 intentionally defined no Pilot V1 domain tables.

## Phase 5 Tenancy Foundation - Confirmed

Phase 5 creates the first operational data model:

| Table | Purpose | Identifier | Ownership |
| --- | --- | --- | --- |
| `organizations` | Customer firm or isolated tenant boundary. | Internal UUID generated by PostgreSQL. | Global tenant boundary. |
| `offices` | Operational office or branch. | Internal UUID generated by PostgreSQL. | Belongs to exactly one organization through `organization_id`. |

Implemented constraints:

- `organizations.id` primary key.
- `organizations.slug` globally unique.
- `organizations.status` constrained by the `organization_status` enum:
  `active`, `inactive`.
- Organization slug format check for normalized lowercase slugs.
- `offices.id` primary key.
- `offices.organization_id` required foreign key to `organizations.id`.
- `offices.status` constrained by the `office_status` enum: `active`,
  `inactive`.
- `offices.code` unique within an organization through
  `offices_organization_code_unique`.
- Office code format check for normalized uppercase codes.
- Required nonblank names and time zones.

Foreign-key behavior:

- `offices_organization_id_fk` uses `ON DELETE restrict` and
  `ON UPDATE cascade`.
- Deleting an organization that still owns offices is blocked; offices are not
  silently cascade-deleted.

Application validation:

- Organization slugs are normalized in
  `apps/operational/src/server/tenancy/validation.ts`.
- Office codes are normalized in
  `apps/operational/src/server/tenancy/validation.ts`.
- Office time zones are validated with runtime `Intl` support rather than a
  hand-written time-zone list.
- Tenant access scopes are validated in
  `apps/operational/src/server/tenancy/scope.ts`.

Persistence:

- Setup-level functions can create and find organizations.
- Setup-level functions can create offices inside a specified organization.
- Office reads require an explicit organization-wide or office-limited access
  scope.
- Inaccessible cross-organization offices are returned as
  `not_found_or_inaccessible`, the same public result as nonexistent offices.

No authentication, memberships, RBAC, users, imports, readiness snapshots,
Decision Log entries, audit events, or customer pilot records are implemented in
this phase.

## Phase 5D Identity And Authorization Model - Confirmed

Phase 5D adds four persistence models without changing the source-of-truth policy
for operational customer records:

| Table | Purpose | Lifecycle or key rule | Ownership |
| --- | --- | --- | --- |
| `users` | Provider-independent application identity. | `active`, `invited`, `suspended`, `disabled`; normalized email unique but not the immutable identity key. | Global application record. |
| `external_identities` | Verified provider identity mapping. | `(provider, provider_subject)` unique. | Belongs to one user. |
| `organization_memberships` | User role and access relationship to one organization. | `invited`, `active`, `suspended`, `revoked`; `(organization_id, user_id)` unique; optimistic `version`. | Belongs to one organization and user. |
| `office_assignments` | Explicit office access for restricted memberships. | Membership/office pair unique. | Belongs to the same organization as both membership and office. |

Membership roles are `organization_admin`, `operations_manager`, `dispatcher`,
`technical_reviewer`, `field_technician`, and `viewer`. Office policy is `all`
or `restricted`; the server additionally validates that the role may use `all`.

Database integrity includes:

- Explicit `RESTRICT`/`CASCADE UPDATE` foreign keys.
- Composite `(id, organization_id)` unique keys on offices and memberships.
- Composite office-assignment foreign keys that make cross-organization
  assignment impossible even if application validation fails.
- Indexes for user email, provider identity ownership, user/status membership
  lookup, organization member lists, membership assignments, and
  organization/office assignment lookup.
- Created/updated actor fields on memberships and created actor on assignments.

The application does not store passwords, provider tokens, SSNs, dates of birth,
home addresses, banking, medical, immigration, or unnecessary provider-profile
fields.

Invitation delivery is not implemented. Preparing a membership creates or reuses
an application user and creates an `invited` membership; it does not create a
token or claim that email was sent.

Development fixture data is created only by
`npm run seed:identity:dev`; it is not present in the production migration.
See [ADR-007](decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md).

## Derived Data

Current demo derived data:

- Readiness summaries and copy packets are derived by `operationalCompression.js`.
- Operational impact, data quality, issue counts, bottlenecks, and review-time estimates are derived by `operationalImpact.js`.
- Demo QA report data is derived by `demoControlCenter.js`.

Pilot V1 target derived data:

- Readiness statuses and explanations.
- Cascading impact after proposed coverage.
- Data-quality findings from imported records.
- Operational-impact measurements.

## Integrations

Implemented product integrations: none found.

Local browser capabilities:

- `FileReader`
- `localStorage`
- `navigator.clipboard`
- generated `blob:` download URLs

External integrations explicitly absent in current root evidence:

- CRM/email sending.
- Scheduling import beyond local CSV preview.
- LIMS/ERP.
- Authentication.
- Analytics/monitoring SDK.
- External AI/OCR.
- Database persistence.

## Implementation Gaps

- Persistent organization, office, user, external identity, membership, and
  office-assignment schemas exist; the remaining Pilot V1 records do not.
- Operational vNext has tenancy and identity/RBAC migrations. It still has no
  import, readiness, coverage, Decision Log, general audit event, technician,
  equipment, work-order, or project tables.
- No XLSX import implementation was found in the current static demo.
- No import history or durable readiness snapshot exists.
- No writeback protections exist because no external writeback integration exists.

## Open Questions

- [OPEN QUESTION - High Impact] Should initial imports replace complete source snapshots or support incremental updates?
- [OPEN QUESTION - High Impact] What exact database schema should implement the conceptual readiness, snapshot, and recalculation model?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to customer Pilot V1 data?
- [OPEN QUESTION - Medium Impact] Can Project Managers edit imported records directly, or only submit corrections?
- [OPEN QUESTION - Medium Impact] Should partner-firm personnel be represented as eligible coverage resources?
