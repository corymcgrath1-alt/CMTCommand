# Domain Model And Glossary

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `app.js`
  - `operationalCompression.js`
  - `operationalImpact.js`
  - `demoWalkthrough.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
  - `tests/`
  - `apps/operational/src/server/dispatch/`
  - `apps/operational/src/server/db/schema/`
  - `apps/operational/tests/integration/dispatch-workflow.integration.test.ts`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
- Last Reviewed: 2026-07-16

## Current Demo - Confirmed

| Canonical term | Definition | Related entities | Allowed states / rules | Evidence |
| --- | --- | --- | --- | --- |
| CMTCommand | Static demo operations command center for CMT/geotech/special inspection readiness. | All root app modules. | Root scope excludes nested `euchre-platform/` and `brackethub/`. | `README.md`, `AGENTS.md` |
| Tomorrow Readiness | Main readiness view for scheduled work before dispatch. | Work orders, technicians, equipment, decision log, operational impact. | Uses Ready, At Risk, Not Ready style states. | `README.md`, `app.js` |
| Work Order | Scheduled field assignment in demo data. | Project, service type, assigned technician, required certifications/equipment, readiness. | TRD-104 is the centerpiece risk-bearing work order. | `app.js`, `tests/operationalImpact.test.js` |
| Readiness Status | User-visible status of whether work is ready. | Work order readiness, badges, impact. | Ready, At Risk, Not Ready appear in code/UI. | `app.js`, `operationalImpact.js` |
| TRD-104 | Centerpiece work order for the demo story. | Maria Lopez, Find Coverage, Decision Log, Operational Impact. | Must start risk-bearing before approval. | `README.md`, `DEVELOPER_NOTES.md`, `demoControlCenter.js` |
| Maria Lopez | Recommended qualified coverage option for TRD-104. | Coverage candidate, Decision Log. | Must remain recommended qualified option. | `DEVELOPER_NOTES.md`, `app.js`, `tests/operationalImpact.test.js` |
| Find Coverage | UI workflow that compares coverage options. | Work order, technician, certifications, equipment, ETA, schedule impact. | Approving Maria creates or updates local decision state. | `app.js`, `README.md` |
| Decision Log | Local-only session record of operational decisions. | TRD-104, coverage, pickup, partner, manager override decisions. | Must record TRD-104 approval locally. | `app.js`, `demoControlCenter.js` |
| Operational Impact | Deterministic summary of issues caught, time saved, patterns, bottlenecks, data quality. | Work orders, technicians, equipment, decision log, intake. | Estimates are conservative; exact ROI is a non-goal. | `operationalImpact.js`, `tests/operationalImpact.test.js` |
| Pilot Setup | Local-only CSV/document intake preview. | Import entities, CSV parse/validate, document metadata. | Malformed/missing-column CSV is blocked; blank required fields are warnings. | `README.md`, `pilotIntakeSafety.js`, `tests/pilotIntakeSafety.test.js` |
| Pilot Materials | Buyer/founder pilot support materials. | Questions, data request, success criteria, objections, follow-up, scorecard. | Must avoid sensitive payroll, HR, pricing, personal data. | `pilotReadinessPack.js`, `tests/pilotReadinessPack.test.js` |
| Demo QA | Deterministic local readiness report. | Required utilities, TRD-104, walkthrough, copy materials, local state. | Should report local demo readiness, not production monitoring. | `demoControlCenter.js`, `tests/demoControlCenter.test.js` |
| Pilot Story Mode | Guided demo walkthrough. | `data-demo-target`, walkthrough state, recap. | `demoWalkthrough.js` currently defines 11 steps. | `demoWalkthrough.js`, `DEVELOPER_NOTES.md` |

## Founder Decision - 2026-07-13

| Canonical term | Definition | Related entities | Rules / distinctions | Evidence |
| --- | --- | --- | --- | --- |
| Engineering Testing Operations Command Center | Product category for CMTCommand. | Tomorrow Readiness, coverage, decision log, operational impact. | Operational execution product, not LIMS/ERP/CRM/payroll/accounting. | Founder decision, 2026-07-13 |
| Tomorrow Readiness + Coverage Decision System | First operational wedge for Pilot V1. | Readiness board, action queue, coverage, decision log, impact snapshot. | Answers whether tomorrow's scheduled work can be performed. | Founder decision, 2026-07-13 |
| Pilot V1 | 90-day, single-office operational pilot. | One participating firm/office, imported operational data, durable decisions. | Does not include enterprise rollout or deep integrations. | Founder decision, 2026-07-13 |
| Organization | Customer firm boundary for authenticated access. | Offices, users, imports, decisions. | All reads/writes must be scoped to authenticated organization. | Founder decision, 2026-07-13 |
| Office | Participating operational office within an organization. | Users, technicians, work orders, equipment, decisions. | Pilot V1 starts with one office but must be architected for later isolation. | Founder decision, 2026-07-13 |
| Readiness Snapshot | Durable result of readiness evaluation for a set of work orders. | Work orders, rule results, explanations, issues, action queue. | CMTCommand is authoritative for generated snapshots in Pilot V1. | Founder decision, 2026-07-13 |
| Readiness Issue | A hard failure or warning produced by a readiness rule. | Rule evaluated, input used, severity, explanation, remediation. | Hard failures produce Not Ready; warnings can produce At Risk. | Founder decision, 2026-07-13 |
| Critical Action Queue | Ordered set of operational issues needing attention. | Readiness issues, work orders, coverage recommendations. | Pilot V1 output; ranking details remain unresolved. | Founder decision, 2026-07-13 |
| Coverage Recommendation | Suggested replacement or coverage action for a readiness issue. | Eligible technicians, required certifications, equipment, availability, cascading impact. | TRD-104/Maria Lopez is canonical demo story, not production hardcoding. | Founder decision, 2026-07-13 |
| Cascading Impact | Downstream readiness effect caused by moving or approving coverage. | Affected work orders, technicians, equipment. | Directly and indirectly affected work orders must recalculate after approval. | Founder decision, 2026-07-13 |
| Data-Quality Report | Report of missing, invalid, duplicate, sensitive, or unexpected import data. | Import history, imported datasets, validation failures. | Pilot uploads must be validated and access-controlled. | Founder decision, 2026-07-13 |

## Operational vNext Dispatch Domain - Confirmed

| Canonical term | Definition | Related entities | Rules / distinctions | Evidence |
| --- | --- | --- | --- | --- |
| Service Type | Organization-owned catalog entry describing the kind of operational service requested. | Work order, organization, optional default office. | Key is unique within an organization; inactive/archived entries cannot be selected for new work, while historical work-order references remain valid. | `apps/operational/src/server/db/schema/service-types.ts` |
| Technician | Business-operational person record used for dispatch. | Home office, office eligibility, optional organization membership, assignment relationships. | A technician may exist without a login. Linking a membership enables own-assignment identity but never grants application permissions from the technician record. | `apps/operational/src/server/db/schema/technicians.ts` |
| Technician Office Eligibility | Current dispatch eligibility for a technician at an office. | Technician, office, organization. | Eligibility answers where dispatch may assign the technician; it is distinct from an authenticated user's office authorization. | `apps/operational/src/server/db/schema/technician-office-eligibilities.ts` |
| Work Order | Organization/office-owned request for scheduled service work. | Project, durable service type, dispatch assignments. | Lifecycle is `draft -> ready_for_dispatch -> scheduled -> in_progress -> completed`, with cancellation from nonterminal states. Assignment changes reconcile current work-order state transactionally. | `apps/operational/src/server/db/schema/work-orders.ts`, `apps/operational/src/server/dispatch/domain.ts` |
| Dispatch Assignment | Scheduled operational handoff from a work order to a primary technician and optional support technicians. | Work order, assignment-technician relationships, assignment events. | Lifecycle is `draft`, `unassigned`, `assigned`, `acknowledged`, `in_progress`, `completed`, or `cancelled`; terminal assignments do not reopen silently. | `apps/operational/src/server/db/schema/dispatch-assignments.ts`, `apps/operational/src/server/dispatch/domain.ts` |
| Assignment Technician | Durable primary/support relationship between an assignment and technician. | Dispatch assignment, technician. | At most one active primary; zero or more active support technicians; ended relationships remain as reassignment history. | `apps/operational/src/server/db/schema/assignment-technicians.ts` |
| Assignment Event | Append-only domain history for creation, scheduling, technician changes, lifecycle transitions, and conflict overrides. | Dispatch assignment, actor, related technicians. | Inserted atomically with assignment mutations; database guards reject update/delete. It is not the future general security audit platform. | `apps/operational/src/server/db/schema/assignment-events.ts`, `apps/operational/drizzle/0006_dispatch-backfill-and-history-guards.sql` |

Dispatch interval overlap uses half-open intervals: `[start, end)`. Adjacent
boundaries do not conflict. Active relationships on non-cancelled assignments
are checked; an override is blocked by default and requires explicit permission,
an explicit reason, actor attribution, and a durable `conflict_overridden` event.

## Phase 5F Audit Domain - Confirmed

- **Audit Event**: an immutable general operational or security fact recording
  verified actor context, taxonomy, outcome, target, bounded state, request
  correlation, office context, and server time.
- **Assignment Event**: append-only domain history for dispatch assignment
  lifecycle and technician relationships. It is not the general audit record.
- **Application Log**: diagnostic runtime output. Logs may be rotated or sampled
  and are not the authoritative accountability record.
- **Security Audit Event**: a membership, authorization, organization, office,
  authentication, or system category that requires the stronger
  `audit.read_security` permission.
- **Actor Role Snapshot**: the persisted role at event time. It explains the
  historical context and does not grant current access.
- **Correlation ID**: a server-generated identifier shared by related events
  from one material operation. It is not a session or credential.

Audit state is a minimal allowlisted explanation of material changes, not a
copy of a source row. Contact details, credentials, documents, media,
transcripts, and report contents are outside the audit-state contract.

## Readiness Status Rules - Pilot V1 Target

Status precedence:

```text
Not Ready > At Risk > Ready
```

Any hard failure produces Not Ready, regardless of warnings or satisfied conditions.

Ready means every mandatory requirement is satisfied and no unresolved warning exists. Mandatory requirements include assigned technician, availability, no overlap, valid certifications, valid clearances, available equipment, valid calibration, critical work-order/service information, approved assignment changes, and no hard failure.

At Risk means all mandatory requirements are satisfied, but warnings threaten reliable execution. Warnings may include approaching certification or calibration expiration, tight travel/turnaround, no practical backup, only one eligible technician, missing noncritical information, constrained equipment, downstream pressure, or limited operational margin.

Not Ready means any mandatory condition is unsatisfied. Hard failures include no assigned technician, unavailable technician, assignment overlap, missing or expired certification, missing clearance, no available equipment, expired calibration, missing critical scheduling/service information, no qualified coverage candidate, unapproved replacement, or coverage that creates unresolved hard failure elsewhere.

Every readiness result must identify:

- Rule evaluated.
- Input used.
- Result.
- Severity.
- Explanation.
- Remediation path when one exists.

## Inconsistent Or Risky Terminology

- `Pilot Materials` in navigation and `Pilot Readiness Pack` in `pageLabels` appear to refer to the same static demo surface. Prefer "Pilot Materials" for user-facing docs because that is the nav label and README term.
- `Demo QA` and `Demo Control Center` appear to refer to the same surface. Prefer "Demo QA" for user-facing docs and note `demoControlCenter.js` as the implementation module.
- The founder-defined product category is Engineering Testing Operations Command Center. Current README still describes CMT/geotech/special inspection readiness; treat that as current-demo wording until product copy is intentionally changed.

## Open Questions

- [OPEN QUESTION - High Impact] What exact certification-expiration warning threshold should Pilot V1 use?
- [OPEN QUESTION - High Impact] What exact calibration-expiration warning threshold should Pilot V1 use?
- [OPEN QUESTION - High Impact] How should travel-time and turnaround risk be calculated?
- [OPEN QUESTION - High Impact] What ranking weights should order coverage candidates?
- [OPEN QUESTION - Medium Impact] Should office boundaries restrict coverage recommendations in Pilot V1?
- [OPEN QUESTION - Medium Impact] Should partner-firm personnel be represented in Pilot V1 coverage data?
