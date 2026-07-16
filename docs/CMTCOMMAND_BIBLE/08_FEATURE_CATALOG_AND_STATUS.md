# Feature Catalog And Status

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `app.js`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `demoWalkthrough.js`
  - `pilotIntakeSafety.js`
  - `operationalImpact.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
  - `tests/`
  - `apps/operational/src/server/operational-records/`
  - `apps/operational/tests/integration/operational-records.integration.test.ts`
  - `docs/CMTCOMMAND_BIBLE/plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
- Last Reviewed: 2026-07-16

Allowed status values in this document: Implemented, Partially Implemented, Prototype, Disabled, Incomplete, Deprecated, Unclear. Pilot V1 target features that are authorized but not built are marked Incomplete with scope `Pilot V1 Target`.

## Current Demo - Confirmed Feature Inventory

| Scope | Feature | Status | User entry point | Main implementation | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Current Demo | Tomorrow Readiness | Implemented | `command` page | `app.js`, `operationalCompression.js`, `operationalImpact.js` | `tests/operationalImpact.test.js`, `tests/operationalCompression.test.js`, `tests/demoControlCenter.test.js` | Demo data only. |
| Current Demo | Find Coverage | Implemented | `demo` page / `data-open-coverage` | `app.js` | `tests/demoControlCenter.test.js`, browser artifact | Supports TRD-104/Maria story. |
| Current Demo | Dispatch | Prototype | `dispatch` page | `app.js`, `styles.css` | Covered only indirectly by root syntax/tests | Visible demo surface; no backend dispatch. |
| Current Demo | People Readiness | Prototype | `technicians` page | `app.js`, `styles.css` | Indirect root checks | Demo workforce/certification surface. |
| Current Demo | Equipment Readiness | Prototype | `equipment` page | `app.js`, `styles.css` | Indirect root checks | Demo equipment/calibration surface. |
| Current Demo | Pilot Setup | Implemented | `dataintake` page | `app.js`, `pilotIntakeSafety.js`, `operationalCompression.js`, `operationalImpact.js` | `tests/pilotIntakeSafety.test.js`, `tests/operationalCompression.test.js`, browser artifact | Local-only CSV/document preview. |
| Current Demo | Decision Log | Implemented | `decisionlog` page | `app.js` | `tests/demoControlCenter.test.js`, browser artifact | Session-local, not durable audit storage. |
| Current Demo | Operational Impact | Implemented | Tomorrow Readiness / impact sections | `operationalImpact.js`, `app.js` | `tests/operationalImpact.test.js` | Conservative estimates, not exact ROI. |
| Current Demo | Pilot Materials | Implemented | `pilotpack` page | `pilotReadinessPack.js`, `app.js` | `tests/pilotReadinessPack.test.js`, `tests/demoControlCenter.test.js` | Naming overlaps with "Pilot Readiness Pack". |
| Current Demo | Demo QA | Implemented | `demoqa` page | `demoControlCenter.js`, `app.js` | `tests/demoControlCenter.test.js` | Local deterministic health report. |
| Current Demo | Pilot Story Mode | Implemented | Tomorrow Readiness / guided controls | `demoWalkthrough.js`, `app.js` | `tests/demoWalkthrough.test.js`, `tests/demoControlCenter.test.js` | 11-step guided demo. |
| Current Demo | Standard/Command visual modes | Implemented | Appearance selector / `?ui=` | `app.js`, `styles.css` | Browser artifact, root checks | Local preference. |
| Current Demo | Dark theme | Implemented | Theme button | `app.js`, `styles.css` | Browser artifact, root checks | Local preference. |
| Current Demo | Global search | Implemented | Topbar search | `app.js` | Root syntax only | Local demo search. |
| Current Demo | Projects/Work Orders/Workforce/Certifications/Lab/Geotech/Reports/Billing previews | Prototype | Role/page labels and page renderers | `app.js` | Root syntax only | Presence does not prove full feature completeness. |
| Current Demo | Settings | Prototype | `settings` page | `app.js` | Root syntax only | References permissions/rates/templates/future integrations without real backend/config evidence. |

## Pilot V1 Target Feature Inventory

| Scope | Feature | Status | User-visible purpose | Main implementation | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Pilot V1 Target | Tomorrow Readiness + Coverage Decision System | Incomplete | Determine whether tomorrow's scheduled work can be performed. | Not implemented | Not implemented | Governing spec: [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md). |
| Pilot V1 Target | Durable operational dispatch records | Implemented | Manage tenant/office-owned projects, service types, technicians, work orders, and assignment lifecycle for later imports, readiness, coverage, and field workflows. | Phase 5E schemas; `src/server/operational-records/`; `src/server/dispatch/`; protected APIs and pages | Unit, PostgreSQL integration, and Playwright dispatch workflow tests | Source IDs remain distinct from internal/human IDs; assignment events remain domain history while Phase 5F adds separate general audit history. |
| Pilot V1 Target | General append-only audit history | Implemented for local/test foundation | Preserve typed actor-attributed history for existing material identity and operational mutations. | `audit_events`; `src/server/audit/`; `/api/audit`; `/app/audit` | Unit, PostgreSQL immutability/atomicity/isolation tests, and Playwright audit scenarios | Production retention, archival, legal hold, purge, database-role grants, read auditing, and SIEM remain unresolved. |
| Pilot V1 Target | Controlled CSV/XLSX imports | Incomplete | Load operational data with preview, validation, data-quality reporting, and import history. | Not implemented | Not implemented | Current demo supports local CSV preview only. |
| Pilot V1 Target | Durable readiness snapshots | Incomplete | Store rule-backed readiness results and explanations. | Not implemented | Not implemented | CMTCommand target source of truth for generated snapshots. |
| Pilot V1 Target | Deterministic readiness engine | Incomplete | Apply Ready/At Risk/Not Ready rules with explanations and precedence. | Not implemented | Not implemented | Rules authorized; implementation pending. |
| Pilot V1 Target | Critical action queue | Incomplete | Prioritize issues needing operational attention. | Not implemented | Not implemented | Ranking details unresolved. |
| Pilot V1 Target | Coverage recommendation | Incomplete | Recommend eligible replacement coverage and show why. | Not implemented | Not implemented | Candidate ranking weights unresolved. |
| Pilot V1 Target | Cascading-impact calculation | Incomplete | Show downstream readiness effects of coverage changes. | Not implemented | Not implemented | Recalculation required after approval. |
| Pilot V1 Target | Coverage approval workflow | Incomplete | Approve ordinary coverage changes and route significant changes. | Not implemented | Not implemented | Significant-change threshold unresolved. |
| Pilot V1 Target | Auditable Decision Log | Incomplete | Preserve decisions and correcting entries. | Not implemented | Not implemented | Current demo log is local/session-only. |
| Pilot V1 Target | Authenticated identity boundary | Partially Implemented | Resolve a verified external identity to a provider-independent CMTCommand user. | `apps/operational/src/server/auth/`, `users`, `external_identities` | Unit and PostgreSQL integration tests | Production provider is not selected; development/test adapter only and production fails closed. |
| Pilot V1 Target | Organization memberships | Partially Implemented | Require an active organization relationship and support multiple organizations. | `organization_memberships`, auth resolver, `/app` | Unit, PostgreSQL integration, and browser acceptance passed for the bounded local/test scope. | Invitation acceptance/delivery remains deferred. |
| Pilot V1 Target | Office access assignments | Implemented | Derive all-office or assigned-office scope with cross-organization protection. | `office_assignments`, auth resolver, office APIs | Unit, integration, and browser tests | Composite foreign keys enforce same-organization assignment. |
| Pilot V1 Target | Role-based access control | Partially Implemented | Enforce current reads/writes by organization, office, and role. | `apps/operational/src/server/auth/permissions.ts`, protected identity and Phase 5E surfaces | Unit, integration, and browser tests | Central RBAC covers identity/member/office behavior and bounded operational dispatch, including linked own-assignment access; future import/readiness/coverage permissions await those modules. |
| Pilot V1 Target | Membership administration | Implemented | List, prepare, role/status-manage, and office-scope members. | `/app/admin/members`, `src/server/members/service.ts` | Integration, authorization, and general-audit tests | No invitation email; Phase 5F persists material membership and office-access events. |
| Pilot V1 Target | Pilot operations and health | Incomplete | Support deployment, backups, rollback, logs, and health checks. | Not implemented | Not implemented | Provider unresolved. |

## Future Workstream Feature Inventory

| Scope | Feature | Status | User-visible purpose | Main implementation | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Future Field Operations | Concrete inspection capture and reporting | Incomplete | Connect an authorized assignment to field evidence, human-reviewed report, sample handoff, and internal export. | Architecture/docs only | Runtime tests not implemented | Phase 5E closes durable-record prerequisite P2, but FR-1 remains blocked by the other gates; see [Field Operations V1](specs/FIELD_OPERATIONS_V1.md). |
| Future Field Operations | Immutable evidence and derivatives | Incomplete | Preserve original media and provide usable private previews. | ADR-006 only | Not implemented | Still blocked by production identity, general audit persistence, private storage, and approved reporting/retention rules. |
| Future Field Operations | Advisory truck-ticket extraction | Incomplete | Suggest evidence-linked ticket values for human review. | Contract only | Not implemented | Manual/no-provider workflow is mandatory. |
| Future Field Operations | Report review and immutable versioning | Incomplete | Attest, technically review when required, preserve approvals/amendments. | Contract only | Not implemented | AI cannot attest, approve, or submit. |
| Future Field Operations | Cylinder/sample handoff | Incomplete | Show pickup, transit, receipt, and exception state to operations. | Contract only | Not implemented | Not a full LIMS. |
| Future Field Operations | Procore and email adapters | Incomplete | Exchange approved versions/evidence through confirmed mappings and retries. | Roadmap only | Not implemented | Deferred beyond FR-1. |

## Inferred

The strongest implemented current-demo feature set is the founder demo path plus Pilot Setup safety and Demo QA. Several operational module pages are prototype/demo surfaces until tests and product acceptance criteria prove completion.

## Resolved Direction

The first operational workflow to complete is:

```text
Import operational data -> Calculate Tomorrow Readiness -> Identify TRD-104 as Not Ready -> Explain hard failures -> Find eligible coverage -> Recommend Maria Lopez -> Show cascading impact -> Approve coverage -> Recalculate affected work orders -> Record the decision -> Measure issue caught and estimated operational time saved
```

TRD-104 and Maria Lopez remain canonical demo story records. Pilot production logic must generalize the workflow to imported customer data and must not hardcode those fictional records.

## Open Questions

- [OPEN QUESTION - High Impact] What acceptance threshold moves a Pilot V1 target feature from Incomplete to Implemented?
- [OPEN QUESTION - High Impact] What exact coverage-candidate ranking weights should be used?
- [OPEN QUESTION - High Impact] What exact operational-impact and time-saved formulas should be used?
- [OPEN QUESTION - Medium Impact] Which current prototype surfaces should remain visible while operational vNext is built?
- [OPEN QUESTION - High Impact] When should the Future Field Operations workstream enter the executable roadmap without displacing Pilot V1?
