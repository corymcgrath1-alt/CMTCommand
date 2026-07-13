# ADR-001 Preserve Static Demo And Build Operational vNext

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `index.html`
  - `app.js`
  - `styles.css`
  - `scripts/verify-root.mjs`
  - `docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md`
- Last Reviewed: 2026-07-13

## Context

The current CMTCommand root app is a static HTML/CSS/JavaScript demo with no backend, database, authentication, package manifest, or deployment configuration. It is the trusted demo, product-reference implementation, and visual behavior baseline.

Founder direction dated 2026-07-13 authorizes an operational Pilot V1 that requires persistent data, multiple users, authentication, role-based authorization, organization and office scoping, durable imports, durable readiness snapshots, an auditable Decision Log, deployment, monitoring, backups, and rollback.

## Decision

Preserve the current static application as the trusted demo and behavioral reference. Do not transform it through an uncontrolled in-place rewrite.

Build the operational Pilot V1 behind a deliberate architectural boundary.

Keep the exact framework, database, authentication provider, and hosting provider unresolved until the guarded architecture-selection phase.

## Status

Accepted as founder product-direction decision dated 2026-07-13.

## Alternatives Considered

| Alternative | Pros | Cons |
| --- | --- | --- |
| Rewrite the existing demo in place | One app surface; no duplicated product UI at first. | High risk of breaking the trusted demo, losing the TRD-104/Maria baseline, mixing architecture selection with product implementation, and creating a large unreviewable diff. |
| Add backend behavior directly around the existing static app | May preserve some existing files; could incrementally add persistence. | Risks coupling demo-only assumptions to production data, keeping `app.js` as an oversized boundary, and treating UI role selectors as a foundation for real authorization. |
| Create bounded operational vNext while preserving the demo | Protects current demo, allows deliberate stack selection, supports production-grade auth/data/audit boundaries, and keeps current behavior available as reference. | Requires managing duplication risk, visual drift, and a future migration/supersession path. |

Selected: create bounded operational vNext while preserving the static demo.

## Consequences

Positive:

- Current demo remains available for founder demos and regression comparison.
- Operational architecture can be selected for real persistence, auth, organization scoping, and deployment needs.
- Future changes can be reviewed in guarded phases.
- TRD-104/Maria Lopez remains a behavioral baseline without hardcoding it into Pilot V1 production logic.

Tradeoffs:

- Some UI and domain behavior may exist in both demo and operational vNext during transition.
- Teams must actively prevent visual drift from the trusted demo baseline.
- Shared logic extraction must be deliberate, not assumed.
- Documentation must clearly mark Current Demo versus Pilot V1 Target.

## Compatibility Impact

- Existing behavior: current static demo should continue to run unchanged.
- Public interfaces: no current production API exists.
- Local state: existing localStorage keys and demo reset behavior should remain intact.
- Tests: `node scripts\verify-root.mjs` remains required for current-demo changes.
- Documentation: Bible chapters and specs must distinguish implemented demo behavior from target operational behavior.

## Security And Data Impact

- Current demo remains local/demo-safe and does not gain real customer data.
- Operational vNext must add authentication, authorization, organization/office scoping, audit behavior, protected secrets, and data minimization.
- Sensitive data exclusions in [Security Privacy And Permissions](../09_SECURITY_PRIVACY_AND_PERMISSIONS.md) apply to Pilot V1.

## Migration Plan

- Do not create application directories or scaffolding as part of this ADR.
- Phase 0 preserves and baselines the demo.
- Phase 1 selects the operational architecture and records follow-up ADRs.
- Later phases implement data foundation, imports, readiness engine, coverage decisions, UX, security, operations, and release validation.
- Operational functionality may eventually supersede demo-only behavior only after the replacement is verified against the demo baseline.

## Verification Plan

Current-demo protection:

- Run `node scripts\verify-root.mjs` after current-demo changes.
- Use browser smoke checks for affected UI/state behavior.
- Preserve TRD-104/Maria Lopez story invariants.

Operational vNext:

- Add focused tests for each domain layer as it is introduced.
- Include permission, import, readiness, recalculation, decision-log, health, and rollback verification in later phases.

## Reversal Strategy

This decision can be superseded by a later ADR if the bounded vNext approach proves unsuitable. Reversal must preserve or explicitly replace:

- The trusted demo baseline.
- TRD-104/Maria Lopez behavioral reference.
- Current verification commands.
- Documentation of any migration from demo reference to operational product.

## Evidence And References

- [System Architecture](../04_SYSTEM_ARCHITECTURE.md)
- [Pilot V1 Specification](../specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md)
- [Pilot V1 Implementation Sequence](../plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md)
- `README.md`
- `DEVELOPER_NOTES.md`
- `index.html`
- `app.js`
- `styles.css`
- `scripts/verify-root.mjs`

## Open Questions

- [OPEN QUESTION - High Impact] Which framework should implement bounded operational vNext?
- [OPEN QUESTION - High Impact] Which database, authentication provider, and hosting provider should be selected?
- [OPEN QUESTION - Medium Impact] Which demo logic, if any, should eventually be extracted into shared tested modules?
