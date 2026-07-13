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
  - `README.md`
  - `docs/cmtcommand-vnext/plan.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

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

- No persistent schema exists for Pilot V1 target records.
- No XLSX import implementation was found in the current static demo.
- No import history or durable readiness snapshot exists.
- No writeback protections exist because no external writeback integration exists.

## Open Questions

- [OPEN QUESTION - High Impact] Should initial imports replace complete source snapshots or support incremental updates?
- [OPEN QUESTION - High Impact] What exact database schema should implement the conceptual readiness, snapshot, and recalculation model?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to customer Pilot V1 data?
- [OPEN QUESTION - Medium Impact] Can Project Managers edit imported records directly, or only submit corrections?
- [OPEN QUESTION - Medium Impact] Should partner-firm personnel be represented as eligible coverage resources?
