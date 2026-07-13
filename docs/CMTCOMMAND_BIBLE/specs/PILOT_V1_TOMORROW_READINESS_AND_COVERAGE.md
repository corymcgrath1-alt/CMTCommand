# Pilot V1 Tomorrow Readiness And Coverage

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `app.js`
  - `pilotIntakeSafety.js`
  - `operationalImpact.js`
  - `demoControlCenter.js`
  - `docs/CMTCOMMAND_BIBLE/01_VISION_AND_PRODUCT_PRINCIPLES.md`
  - `docs/CMTCOMMAND_BIBLE/02_DOMAIN_MODEL_AND_GLOSSARY.md`
  - `docs/CMTCOMMAND_BIBLE/03_USERS_ROLES_AND_WORKFLOWS.md`
- Last Reviewed: 2026-07-13

## Problem

Operations teams can have work scheduled for tomorrow without knowing whether every assignment is actually executable. CMTCommand Pilot V1 must help the person responsible for tomorrow's staffing and execution answer:

```text
Can we successfully perform tomorrow's scheduled work?
```

## User And Actor

- Primary buyer: Operations Manager.
- Primary daily users: Operations Manager and Dispatcher.
- Secondary stakeholders: CMT Manager, Branch Manager, Owner, Principal Engineer, Project Manager, Executive leadership.
- Explicitly not first users: Field technicians as full application users.

## Pilot Scope

Pilot V1 is a 90-day, single-office Tomorrow Readiness and Coverage pilot for one participating firm and office.

## Desired Behavior

- Import controlled operational data.
- Calculate Tomorrow Readiness.
- Classify work orders as Ready, At Risk, or Not Ready.
- Explain exactly which rules produced each status.
- Surface a critical action queue.
- Find eligible coverage for hard failures.
- Recommend coverage, show cascading impact, support approval, and recalculate affected work orders.
- Record auditable decisions and corrections.
- Report data quality and pilot operational impact.

## Non-Goals

- Payroll.
- Billing.
- CRM.
- Full project management.
- LIMS functionality.
- Accounting.
- Native mobile applications.
- Live GPS tracking.
- Deep real-time integrations.
- Enterprise-wide rollout.
- Silent writeback to customer source systems.

## Canonical Terminology

- Engineering Testing Operations Command Center: product category.
- Tomorrow Readiness + Coverage Decision System: first operational wedge.
- Work Order: scheduled unit of work requiring personnel, equipment, service information, and readiness evaluation.
- Readiness Snapshot: durable readiness result for a work set.
- Readiness Issue: hard failure or warning produced by a rule.
- Critical Action Queue: ordered list of issues requiring operational attention.
- Coverage Recommendation: suggested assignment resolution with evidence and impact.
- Cascading Impact: downstream readiness effect of moving coverage.
- Decision Log: auditable record of operational decisions and corrections.

See [Domain Model And Glossary](../02_DOMAIN_MODEL_AND_GLOSSARY.md).

## Required Input Datasets

| Dataset | Required content | Source-of-truth boundary |
| --- | --- | --- |
| Technician roster | Business name, internal employee identifier, office, operational role, work contact details when allowed. | Customer source remains authoritative. |
| Technician availability | Availability for required work periods, absence/unavailability, assigned work. | Customer source remains authoritative. |
| Certifications | Certification type, holder, status, expiration date. | Customer source remains authoritative. |
| Security clearances | Required clearance category and technician status. | Customer source remains authoritative. |
| Equipment inventory | Equipment identifier, type, office/location/status when available. | Customer source remains authoritative. |
| Equipment availability | Assignment, availability, constraints. | Customer source remains authoritative. |
| Calibrations | Equipment calibration status and expiration. | Customer source remains authoritative. |
| Service requirements | Required certifications, clearances, equipment, critical information by service type. | Customer source remains authoritative. |
| Upcoming work orders | Work date, time window, project, job site, service type, assigned technician, required equipment. | Customer source remains authoritative. |
| Projects and job sites | Project/job-site information needed for dispatch decisions. | Customer source remains authoritative. |
| Assignment data | Technician/equipment assignments and overlaps. | Customer source remains authoritative. |

## Import Validation

Pilot V1 should initially use controlled CSV/XLSX imports.

Validation must detect or report:

- Missing required columns.
- Missing required values.
- Duplicate identifiers.
- Invalid dates.
- Invalid status values.
- Unexpected columns.
- Prohibited sensitive columns.
- Credentials, passwords, tokens, API keys, or other secrets inside imported files.
- Records that cannot be mapped to the participating organization/office.

Imports should provide preview before commit, durable import history after commit, and data-quality reporting for accepted imports.

## Data Ownership

Customer systems remain authoritative for underlying work orders, personnel, certifications, equipment, and scheduling records.

CMTCommand Pilot V1 is authoritative for:

- Generated readiness snapshots.
- Detected readiness issues.
- Coverage recommendations.
- Approved coverage decisions.
- Decision history.
- Recorded pilot-impact measurements.

Pilot V1 must not silently overwrite external source systems.

## Readiness Evaluation

Readiness must be deterministic, testable, and explainable.

Status precedence:

```text
Not Ready > At Risk > Ready
```

Any hard failure produces Not Ready.

Ready requires all of the following:

- A technician is assigned.
- The technician is available for the required period.
- No assignment overlap exists.
- Every required certification remains valid through the work date.
- Every required security clearance is valid.
- Required equipment is available.
- Required equipment calibration remains valid through the work date.
- Critical work-order and service information is present.
- Required coverage or assignment changes have been approved.
- No hard failure exists.
- No unresolved operational warning exists.

At Risk applies when all mandatory requirements are satisfied but warnings threaten reliable execution.

Warnings may include:

- Certification approaching expiration.
- Calibration approaching expiration.
- Tight travel or assignment turnaround.
- No practical backup technician.
- Only one eligible technician.
- Missing noncritical information.
- Constrained equipment availability.
- Coverage changes that create downstream pressure.
- Very limited operational margin.

Not Ready applies when any mandatory condition is unsatisfied.

Hard failures include:

- No assigned technician.
- Technician unavailable.
- Assignment overlap.
- Missing required certification.
- Expired required certification.
- Missing required security clearance.
- No available required equipment.
- Expired required equipment calibration.
- Missing critical scheduling or service information.
- No qualified coverage candidate.
- Proposed replacement not yet approved.
- Coverage resolution creates an unresolved hard failure elsewhere.

## Readiness Explanations

Every readiness result must include:

- Rule evaluated.
- Input used.
- Result.
- Severity.
- Explanation.
- Remediation path when one exists.

Explanations must be generated from evaluated rules, not hand-written status copy detached from data.

## Action Queue

The Critical Action Queue must surface readiness issues requiring operational action. It should separate hard failures from warnings and link each item to the affected work order, rule result, and remediation path.

Ranking rules are not approved yet.

## Coverage Eligibility

Coverage candidates must be evaluated against:

- Availability for the required work period.
- Existing assignments and overlaps.
- Required certifications and expiration dates.
- Required security clearances.
- Required equipment and calibration needs.
- Office/organization boundaries.
- Cascading impact on other work orders.

Pilot production logic must not hardcode TRD-104 or Maria Lopez. Those are canonical demo records only.

## Coverage Recommendation

Coverage recommendations must show:

- Candidate.
- Why the candidate is eligible.
- Which failure the recommendation resolves.
- Remaining warnings.
- Cascading impact.
- Required approval.

Coverage-candidate ranking weights are open.

## Cascading Impact Calculation

Before approval, the system must show downstream effects of moving a technician or equipment assignment. After approval, all directly and indirectly affected work orders must be recalculated.

## Coverage Approval

Operations Manager / Dispatcher may approve ordinary coverage decisions. Significant operational changes may require CMT Manager or Branch Manager approval; the threshold is open.

Approval must create a Decision Log entry and update readiness snapshots or derived results according to the selected architecture.

## Recalculation Behavior

After a coverage decision:

- Recalculate the changed work order.
- Recalculate work orders affected by moved technician/equipment availability.
- Recalculate cascading hard failures and warnings.
- Record the recalculation relationship in durable data.

## Decision Log

The Decision Log must be auditable. Corrections must add a new entry that references the original action instead of overwriting or deleting the original decision.

Minimum fields should include:

- Organization and office.
- Actor and role.
- Decision type.
- Affected work order(s).
- Previous state.
- Approved state.
- Reason or note.
- Timestamp.
- Source readiness snapshot.
- Correction reference when applicable.

Exact schema is unresolved.

## Data-Quality Reporting

Data-quality reporting must include import-level and record-level findings for missing, invalid, duplicate, sensitive, unexpected, or unmapped data. Reports should distinguish blocked imports from accepted imports with warnings.

## Operational-Impact Measurement

Pilot V1 must measure the issue caught and estimated operational time saved. Current demo impact calculations are conservative evidence of direction, not approved production formulas.

Exact formulas remain open.

## Permission Rules

| Role | Required permissions |
| --- | --- |
| Organization Admin | Manage users, assign roles, configure office, manage imports, review import failures. |
| Operations Manager / Dispatcher | Review readiness, investigate issues, search coverage, propose assignments, approve ordinary coverage, create Decision Log entries. |
| CMT Manager / Branch Manager | Review office operations, approve significant changes, review impact and data quality. |
| Project Manager | Review relevant projects/work orders, supply or correct project information, review affecting decisions. |
| Executive / Read Only | Review readiness, trends, and impact; no write permissions. |

All reads and writes must be organization-scoped and, where applicable, office-scoped.

## Security And Data Minimization

Allowed data examples:

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

Forbidden data includes Social Security numbers, dates of birth, home addresses, banking, payroll, medical, disability, immigration documents, full background reports, disciplinary notes, personal phone numbers without opt-in, after-hours location, unnecessary driver's-license details, unrelated customer documents, and credentials/secrets inside imported files.

## UI States

Required UI states:

- Default readiness board.
- Import preview.
- Import validation warning/blocking states.
- Loading/calculating/recalculating.
- Empty upcoming work.
- No issues found.
- No eligible coverage.
- Coverage recommendation.
- Cascading-impact warning.
- Approval confirmation.
- Decision recorded.
- Authorization denied.
- Data-quality report.
- Operational-impact snapshot.

## Failure Behavior

- Invalid imports must not be silently ingested.
- Sensitive or prohibited columns must be identified.
- No eligible coverage must be visible as an unresolved issue.
- Unauthorized writes must be denied and logged according to the selected architecture.
- Failed decision writes must not present the coverage change as approved.
- Stale readiness snapshots must force recalculation or conflict resolution.

## Audit Requirements

Pilot V1 audit behavior must record who acted, which organization/office they acted within, what changed, which readiness snapshot supported the decision, and whether a later correction was made.

## Deployment Requirements

Pilot V1 requires managed cloud deployment with development, staging, pilot-production, HTTPS, protected secrets, managed database, automated backups, reproducible deployments, deployment history, rollback, database recovery procedure, app health check, database health check, structured error logging, import-failure logging, and basic monitoring.

Provider selection is open.

## Acceptance Criteria

1. Given valid imported Pilot V1 data, the system creates a durable import history entry and calculates a readiness snapshot.
2. Given one hard failure on a work order, the readiness status is Not Ready even if other requirements are satisfied.
3. Given all mandatory requirements satisfied and at least one warning, the readiness status is At Risk.
4. Given all mandatory requirements satisfied and no unresolved warning, the readiness status is Ready.
5. Every readiness result includes rule evaluated, input used, result, severity, explanation, and remediation path when one exists.
6. Given no assigned technician, the affected work order is Not Ready with an explicit hard-failure explanation.
7. Given an expired required certification or calibration, the affected work order is Not Ready.
8. Given an unapproved proposed replacement, the affected work order remains Not Ready until approval.
9. Given a coverage approval that moves a technician, directly and indirectly affected work orders are recalculated.
10. Given a decision correction, the original Decision Log entry remains and a correcting entry is added.
11. Given a Project Manager without admin role, organization-wide administration is denied.
12. Given an Executive / Read Only user, assignment and operational-record writes are denied.
13. Given an import file with prohibited sensitive columns, validation identifies the columns and does not silently ingest them.
14. Given a TRD-104-equivalent imported scenario, the system can explain the hard failure, recommend eligible coverage, show cascading impact, approve coverage, recalculate, record the decision, and update impact reporting.

## Test Plan

- Unit tests for each readiness rule, status precedence, explanation output, and recalculation dependency.
- Unit tests for coverage eligibility and ranking once ranking rules are approved.
- Import validation tests for valid, missing-column, malformed, duplicate, prohibited-sensitive-column, unexpected-column, and secret-like-value cases.
- Permission tests for allowed and denied role actions across organization and office boundaries.
- Integration tests for import -> readiness snapshot -> coverage recommendation -> approval -> recalculation -> Decision Log.
- Browser or end-to-end tests for the full Tomorrow Readiness + Coverage Decision workflow.
- Deployment smoke tests for app health and database connectivity health.

## Rollout Assumptions

- The current static demo remains available during Pilot V1 development.
- Operational vNext architecture is selected in a guarded phase before implementation.
- Pilot starts with one participating firm and office.
- Customer source systems remain authoritative for underlying records.
- CSV/XLSX imports are the first data path.

## Remaining Open Questions

- [OPEN QUESTION - High Impact] Which framework, database, authentication provider, and hosting provider should operational vNext use?
- [OPEN QUESTION - High Impact] What exact certification-expiration and calibration-expiration warning thresholds should apply?
- [OPEN QUESTION - High Impact] How should travel-time and turnaround risk be calculated?
- [OPEN QUESTION - High Impact] What ranking weights should order coverage candidates?
- [OPEN QUESTION - High Impact] What approval threshold makes a coverage decision significant?
- [OPEN QUESTION - High Impact] What exact operational-impact and time-saved formulas should be used?
- [OPEN QUESTION - High Impact] Should imports replace complete snapshots or support incremental updates?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to pilot data?
- [OPEN QUESTION - Medium Impact] Can Project Managers edit imported records directly, or only submit corrections?
- [OPEN QUESTION - Medium Impact] Should office boundaries restrict coverage recommendations?
- [OPEN QUESTION - Medium Impact] Should partner-firm personnel be represented in Pilot V1?
