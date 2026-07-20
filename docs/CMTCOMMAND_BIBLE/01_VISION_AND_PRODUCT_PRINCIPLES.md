# Vision And Product Principles

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `app.js`
  - `demoWalkthrough.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
  - `docs/cmtcommand-vnext/plan.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

## Current Demo - Confirmed

The root README states that CMTCommand is a static, demo-safe operations command center for CMT/geotech/special inspection firms focused on tomorrow readiness, coverage gaps, decision traceability, and pilot validation.

The confirmed core demo idea is:

```text
Scheduled does not mean ready.
```

Confirmed demo outcomes:

- Readiness blockers can be caught before morning dispatch.
- TRD-104 shows a qualified coverage gap.
- Maria Lopez resolves or reduces the blocker.
- Decision Log records the action locally.
- Operational Impact shows conservative estimated value.
- Pilot Materials supports a pilot conversation.
- Demo QA verifies readiness before a meeting.

Confirmed current-demo boundaries:

- Static HTML/CSS/JavaScript.
- Synthetic/demo data.
- Browser-local demo state.
- Local CSV/document preview only.
- No backend, login, cloud persistence, real analytics, exact ROI, or live integrations.

## Founder Decision - 2026-07-13

CMTCommand is an Engineering Testing Operations Command Center.

Its first operational wedge is:

```text
Tomorrow Readiness + Coverage Decision System
```

The defining operating question is:

```text
Can we successfully perform tomorrow's scheduled work?
```

Primary buyer:

- Operations Manager.

Primary daily users:

- Operations Manager.
- Dispatcher.

Secondary stakeholders:

- CMT Manager.
- Branch Manager.
- Owner.
- Principal Engineer.
- Project Manager.
- Executive leadership.

CMTCommand should not begin as a lab-manager-first product or an executive-dashboard-first product. The daily workflow must prioritize operational action over passive analytics.

## Pilot V1 Target

Pilot V1 is a 90-day, single-office Tomorrow Readiness and Coverage pilot.

Pilot V1 must produce:

- Tomorrow Readiness board.
- Ready, At Risk, and Not Ready classifications.
- Readiness explanations.
- Critical action queue.
- Find Coverage recommendations.
- Coverage approval workflow.
- Cascading-impact warnings.
- Decision Log.
- Data-quality reporting.
- Pilot operational-impact snapshot.

Pilot V1 initially receives controlled CSV/XLSX imports for technician, availability, certification, clearance, equipment, calibration, service requirement, work order, project, job-site, and assignment data.

## Product Boundaries

### Current Demo

- Product-reference demo.
- Visual behavior baseline.
- Canonical TRD-104/Maria Lopez story.
- Local-only import preview and generated materials.

### Pilot V1 Target

- Persistent server-side data.
- Authentication.
- Multiple users.
- Role-based authorization.
- Organization and office scoping.
- Durable imports and readiness snapshots.
- Auditable Decision Log.
- Managed deployment, monitoring, backups, and rollback.

### Explicit Pilot V1 Non-Goals

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

## Important Tradeoffs

### Confirmed

- The current static architecture keeps the demo simple and low-risk but cannot support real persistence, authentication, or multi-user operations.
- Conservative impact calculations reduce overclaiming but leave exact operational-impact formulas unresolved.
- Local-only Pilot Setup increases privacy and demo safety but does not prove live system integration.

### Founder Decision

- Preserve the static demo instead of rewriting it in place.
- Build operational Pilot V1 behind a deliberate architectural boundary.
- Choose framework, database, authentication, and hosting details through guarded architecture decisions rather than incidental scaffolding. Phase 3 selected the architecture category and core stack; exact managed providers remain checkpoints.

## Implementation Gaps

- Current code does not implement multi-user access, durable data, organization/office scoping, or backend deployment.
- Current demo hardens the TRD-104/Maria Lopez story; Pilot V1 must generalize the workflow to imported customer data without hardcoding fictional records.
- Current Operational Impact is a conservative demo estimate; exact Pilot V1 formulas remain undecided.

## Open Questions

- [OPEN QUESTION - High Impact] Which exact managed auth, database, and hosting providers should be selected before real pilot deployment configuration?
- [OPEN QUESTION - High Impact] What exact operational-impact and time-saved formulas should Pilot V1 use?
- [OPEN QUESTION - Medium Impact] What accessibility target should future operational UI work meet?
- [OPEN QUESTION - Medium Impact] Which current prototype surfaces should remain visible in the static demo after Pilot V1 starts?
