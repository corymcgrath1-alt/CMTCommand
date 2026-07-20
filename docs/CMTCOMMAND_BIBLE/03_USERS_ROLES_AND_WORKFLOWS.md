# Users Roles And Workflows

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `app.js`
  - `index.html`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `demoWalkthrough.js`
  - `demoControlCenter.js`
  - `tests/demoControlCenter.test.js`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
- Last Reviewed: 2026-07-13

## Current Demo - Confirmed Roles

The shell includes a role selector for:

- Executive
- Branch Manager
- Dispatcher
- Project Manager
- Lab Manager
- Field Technician
- Geotechnical Engineer
- Admin / Billing

`app.js` defines `roleAccess` for these roles. This is UI state, not authenticated authorization. `authorizedLocationRoles` limits location visibility UI to Executive, Branch Manager, and Dispatcher.

## Current Demo - Unknown Permission Behavior

No root authentication, server session, tenant model, or authorization service was found. Role access should not be treated as a security boundary.

## Founder Decision - 2026-07-13

Primary buyer:

- Operations Manager.

Primary daily users:

- Operations Manager.
- Dispatcher.

Secondary buyers and stakeholders:

- CMT Manager.
- Branch Manager.
- Owner.
- Principal Engineer.
- Project Manager.
- Executive leadership.

Pilot V1 should be invite-only, organization-scoped, initially limited to one participating firm and office, role-based, and auditable. Field technicians do not need to be full application users in Pilot V1.

## Pilot V1 Target Roles

| Role | May | May not / boundary |
| --- | --- | --- |
| Organization Admin | Manage users, assign roles, configure the participating office, manage imports, review import failures. | Should not bypass organization/office scoping. |
| Operations Manager / Dispatcher | Review readiness, investigate issues, search for coverage, propose assignments, approve ordinary coverage decisions, create Decision Log entries. | Should not administer organization-wide settings unless separately assigned. |
| CMT Manager / Branch Manager | Review office-wide operations, approve significant operational changes, review readiness trends, impact, and data quality. | Approval thresholds for "significant" changes remain unresolved. |
| Project Manager | Review relevant projects/work orders, supply or correct project information, review decisions affecting assigned projects. | May not administer the entire organization unless separately assigned. |
| Executive / Read Only | Review readiness, trends, and operational-impact summaries. | May not change assignments or operational records. |

All reads and writes must be scoped to the authenticated organization and, where applicable, office.

Decision Log corrections must preserve the original action and add an auditable correcting entry rather than erasing history.

## Workflow: Current Demo TRD-104 Coverage Story

| Field | Details |
| --- | --- |
| Actor | Demo user, often Executive by default. |
| Trigger | Open Tomorrow Readiness or start Pilot Story Mode. |
| Preconditions | TRD-104 exists and is risk-bearing; Maria Lopez is available/qualified. |
| Normal path | Tomorrow Readiness -> TRD-104 -> Find Coverage -> Maria Lopez -> Approve Coverage Plan -> Decision Log -> Operational Impact -> Pilot Materials -> Demo QA. |
| Data changed | Browser session state: selected demo work order, demo decision, local decision log. |
| Failure paths | Missing TRD-104, missing Maria qualification, missing utility functions, or absent walkthrough target should surface in Demo QA. |
| Completion condition | Decision Log has the coverage decision and Operational Impact reflects improvement. |
| Permission boundary | UI role state only; no authenticated permission enforcement. |
| Entry points | `app.js` pages `command`, `demo`, `decisionlog`, `pilotpack`, `demoqa`. |
| Tests | `tests/demoControlCenter.test.js`, `tests/operationalImpact.test.js`, browser artifact in `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`. |

## Workflow: Pilot V1 Tomorrow Readiness + Coverage Decision

| Field | Details |
| --- | --- |
| Actor | Operations Manager or Dispatcher. |
| Trigger | Controlled import has loaded upcoming work and supporting operational data. |
| Preconditions | Authenticated user is scoped to the organization/office; imports have passed preview validation or produced visible failures. |
| Normal path | Import operational data -> Calculate Tomorrow Readiness -> identify Not Ready work such as TRD-104 in demo data -> explain hard failures -> find eligible coverage -> recommend best candidate -> show cascading impact -> approve coverage -> recalculate affected work orders -> record Decision Log entry -> measure issue caught and estimated time saved. |
| Data created/changed | Import history, readiness snapshot, readiness issues, coverage recommendation, approved coverage decision, recalculated affected work orders, Decision Log entry, operational-impact snapshot. |
| Failure paths | Invalid import, prohibited sensitive columns, no eligible coverage, coverage creates unresolved downstream hard failure, unauthorized approval, stale snapshot, database or health failure. |
| Completion condition | A durable decision exists, affected readiness statuses are recalculated, and the action is visible in impact/data-quality reporting. |
| Permission boundary | Server-enforced organization, office, role, and audit boundaries are required for Pilot V1. |
| Entry points | Not implemented in current code; see [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md). |
| Tests | Not implemented; target tests are defined in [10_TESTING_AND_ACCEPTANCE](10_TESTING_AND_ACCEPTANCE.md). |

## Workflow: Current Demo Pilot Setup Intake

| Field | Details |
| --- | --- |
| Actor | Demo user preparing pilot data. |
| Trigger | Open Pilot Setup. |
| Preconditions | Root app loaded; `CMTPilotIntakeSafety` loaded before `app.js`. |
| Normal path | Select entity -> preview template or upload CSV -> validate -> apply acceptable import -> stage document metadata if needed. |
| Data changed | Browser session state: intake import preview, imported records, staged document metadata, extraction messages. |
| Failure paths | Oversized, malformed, or missing-column CSV becomes Blocked and Apply Import stays disabled. |
| Completion condition | Valid local preview applied or blocked/cleanup state displayed with actionable messages. |
| Permission boundary | None beyond local browser UI; files do not leave browser session by current evidence. |
| Entry points | `app.js` page `dataintake`, `pilotIntakeSafety.js`. |
| Tests | `tests/pilotIntakeSafety.test.js`, `tests/demoControlCenter.test.js`, browser artifact. |

## Open Questions

- [OPEN QUESTION - High Impact] What approval threshold distinguishes ordinary coverage decisions from significant operational changes?
- [OPEN QUESTION - High Impact] Can Project Managers edit imported records directly, or only propose corrections for Operations/Admin review?
- [OPEN QUESTION - Medium Impact] What user-visible failure state should appear when no qualified internal coverage option exists?
- [OPEN QUESTION - Medium Impact] Should office boundaries restrict coverage recommendations by default?
