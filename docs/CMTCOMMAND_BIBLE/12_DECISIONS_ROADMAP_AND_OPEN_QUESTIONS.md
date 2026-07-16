# Decisions Roadmap And Open Questions

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `AGENTS.md`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/cmtcommand-vnext/charter.md`
  - `docs/cmtcommand-vnext/plan.md`
  - `docs/cmtcommand-vnext/status.md`
  - `docs/cmtcommand-vnext/review.md`
  - `docs/cmtcommand-vnext/verification.md`
  - `apps/operational/`
  - `apps/operational/package.json`
  - `apps/operational/package-lock.json`
  - `.github/workflows/operational-ci.yml`
  - `apps/operational/drizzle/0000_open_giant_girl.sql`
  - `apps/operational/src/server/tenancy/`
  - `docs/CMTCOMMAND_BIBLE/plans/PHASE_5_TENANCY_FOUNDATION_REPORT.md`
  - `docs/CMTCOMMAND_BIBLE/13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-16

## Confirmed Decisions

| Decision | Evidence | Consequence | Known tradeoff | Appears current |
| --- | --- | --- | --- | --- |
| Root CMTCommand is a static HTML/CSS/JS app. | `README.md`, `DEVELOPER_NOTES.md`, `docs/cmtcommand-vnext/baseline.md` | Run with local static server; no build required. | No backend/auth/persistence. | Yes |
| Use dependency-free UMD utilities. | Utility files, tests, `DEVELOPER_NOTES.md` | Browser globals plus CommonJS tests. | Large `app.js` still owns rendering/state. | Yes |
| Use `node scripts\verify-root.mjs` as verifier. | `scripts/verify-root.mjs`, CI workflow, README | One command for syntax/tests. | No lint/type/build package checks. | Yes |
| Pilot Setup stays local-only and treats file-derived input as untrusted. | `pilotIntakeSafety.js`, vNext plan/review/tests | Safer CSV/document previews. | No live integration proof. | Yes |
| TRD-104/Maria Lopez remains the centerpiece demo story. | `README.md`, `DEVELOPER_NOTES.md`, tests | Future changes must preserve story health. | Demo may overfit one scenario. | Yes |
| `euchre-platform/` and `brackethub/` are not root CMTCommand scope. | `AGENTS.md`, `MIGRATION_CLEANUP_REPORT.md`, vNext docs | Avoid mixed-workspace damage. | Repo remains mixed until split. | Yes |

## Founder Decisions - 2026-07-13

| Decision | Evidence | Consequence | Known tradeoff | Appears current |
| --- | --- | --- | --- | --- |
| CMTCommand is an Engineering Testing Operations Command Center. | Founder decision, 2026-07-13 | Product docs should frame the product around engineering testing operations. | Current README still uses static demo wording. | Target |
| First operational wedge is Tomorrow Readiness + Coverage Decision System. | Founder decision, 2026-07-13 | Operational work should sequence around readiness, coverage, decisions, and impact. | Excludes many adjacent product directions. | Target |
| Preserve the static demo and build bounded operational vNext. | Founder decision, 2026-07-13; [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md) | Avoid uncontrolled rewrite of trusted demo. | Requires managing duplication and visual drift. | Target |
| Primary buyer is Operations Manager; daily users are Operations Manager and Dispatcher. | Founder decision, 2026-07-13 | UI and workflows should prioritize operational action. | Other stakeholders are secondary. | Target |
| Pilot V1 is a 90-day, single-office pilot. | Founder decision, 2026-07-13 | Scope should not expand into enterprise rollout or deep integrations. | Limits broader market proof. | Target |
| Customer systems remain source of truth for underlying operational records. | Founder decision, 2026-07-13 | CMTCommand should import, evaluate, and record decisions without silent writeback. | Requires explicit source-boundary messaging. | Target |
| Readiness rules are deterministic, explainable, and use Not Ready > At Risk > Ready precedence. | Founder decision, 2026-07-13 | Operational logic must be test-first and rule-backed. | Thresholds and ranking weights remain open. | Target |
| Pilot V1 is invite-only, organization-scoped, role-based, and auditable. | Founder decision, 2026-07-13 | Auth, RBAC, tenant scoping, and audit tests become core requirements. | Identity/RBAC foundation exists; production provider, invitation delivery, and audit persistence remain unresolved. | Target |
| Pilot V1 uses minimum business-operational data and forbids sensitive categories. | Founder decision, 2026-07-13 | Imports must detect prohibited/unexpected sensitive columns. | Exact retention/deletion policy remains open. | Target |
| Pilot V1 needs managed deployment, backups, rollback, health, logging, and monitoring. | Founder decision, 2026-07-13 | Architecture selection must include operations, not just framework choice. | Vendor remains unresolved. | Target |
| Browser validation becomes blocking only after stabilization; ten clean runs is the proposed threshold. | Founder decision, 2026-07-13 | Avoids turning flaky browser checks into merge gates. | Requires reliability tracking before enforcement. | Target policy |

## Architecture Decisions - 2026-07-13

| Decision | Evidence | Consequence | Known tradeoff | Appears current |
| --- | --- | --- | --- | --- |
| Operational vNext should be a full-stack TypeScript modular monolith. | [ADR-002](decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md) | One primary application for UI, server logic, imports, and domain coordination. | Requires module discipline to avoid a tangled monolith. | Target |
| Operational vNext should use Next.js App Router on Node.js runtime. | [ADR-002](decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md) | Enables full-stack TypeScript and managed Next.js deployment path. | Framework-specific security and upgrade discipline required. | Target |
| Operational vNext should live in future `apps/operational/`. | [ADR-003](decisions/ADR-003_OPERATIONAL_VNEXT_REPOSITORY_BOUNDARY.md) | Preserves root static demo and creates app-local dependency/build boundary. | A future root workspace may be needed if shared packages become real. | Target |
| Operational vNext should use PostgreSQL with Drizzle ORM and Drizzle Kit. | [ADR-002](decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md), [Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md) | Relational data model supports pilot entities, constraints, snapshots, decisions, and audits. | Exact provider remains checkpoint. | Target |
| Readiness engine should be pure deterministic TypeScript. | [ADR-002](decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md), [ADR-005](decisions/ADR-005_IMPORT_AND_READINESS_EXECUTION_MODEL.md) | Domain tests can run without browser, server, database, auth, or network. | Requires mapping persistence models into domain facts. | Target |
| Auth uses managed identity plus app-owned RBAC, office scope, and audit. | [ADR-004](decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md) | Keeps credentials outside CMTCommand while enforcing product permissions server-side. | Exact auth provider remains checkpoint. | Target |
| Imports use database-tracked in-app processing, not distributed queue infrastructure by default. | [ADR-005](decisions/ADR-005_IMPORT_AND_READINESS_EXECUTION_MODEL.md) | Keeps Pilot V1 simple and observable. | Queue may be needed if measured imports exceed platform limits. | Target |
| Phase 4 operational scaffold lives under `apps/operational/`. | [Phase 4 Scaffolding Report](plans/PHASE_4_SCAFFOLDING_REPORT.md), `apps/operational/package.json`, `.github/workflows/operational-ci.yml` | Future operational work has an app-local Next.js, TypeScript, npm, test, build, health, and Drizzle boundary. | No Pilot V1 business behavior is implemented yet. | Yes |
| Phase 5 implements only organization/office tenancy persistence before users or product workflows. | [Phase 5 Tenancy Foundation Report](plans/PHASE_5_TENANCY_FOUNDATION_REPORT.md), `apps/operational/drizzle/0000_open_giant_girl.sql`, `apps/operational/src/server/tenancy/` | Tenant-owned office data now has a tested persistence boundary before identities, roles, imports, readiness, or coverage. | Scopes are supplied by trusted internal callers/tests until authentication and memberships exist. | Yes |
| Authorization scope is derived server-side from verified identity and active membership. | [ADR-007](decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md), [Phase 5D report](plans/PHASE_5D_IDENTITY_RBAC_REPORT.md) | Protected requests revalidate application user, membership, organization, office scope, and permissions; browser claims are untrusted. | Production auth provider and persistent audit events remain checkpoints. | Yes |
| Dispatch assignments and append-only assignment events are the durable operational handoff into future Field Operations. | [ADR-008](decisions/ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md), [Phase 5E report](plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md) | Phase 5E owns durable service types, primary/support relationships, lifecycle transitions, conflict policy, own-assignment access, and work-order reconciliation. | Assignment events are domain history, not the general audit platform; Field Operations remains unimplemented. | Yes |

## Field Operations Architecture Direction - 2026-07-15

This is a future-workstream architecture direction, not a change to the founder-approved Pilot V1 scope.

| Decision | Evidence | Consequence | Known tradeoff | Appears current |
| --- | --- | --- | --- | --- |
| Field Operations is positioned after the initial Tomorrow Readiness and Coverage pilot unless a later founder decision changes scope. | [Field Operations chapter](13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md) | Prevents a major field-reporting expansion from silently replacing the first operational wedge. | Delays field workflow implementation until shared foundations and pilot sequencing are resolved. | Target |
| Original field evidence is immutable; derivatives are separate. | [ADR-006](decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md) | Preserves source integrity and allows safe previews/transcodes. | Higher storage, processing, and retention complexity. | Target |
| AI extraction is advisory and every accepted value requires human review with provenance. | [ADR-006](decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md) | AI cannot attest, approve, finalize, or submit professional reports. | More review-state and UI complexity. | Target |
| Approved reports and amendments are immutable versions. | [ADR-006](decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md) | Exports and external sync can reference exactly what was approved. | Requires atomic finalization/version/audit transactions. | Target |
| FR-1 is blocked until every P1-P5 gate is complete; Phase 5E closes only P2. | [Field Operations plan](plans/FIELD_OPERATIONS_IMPLEMENTATION_PLAN.md), [Phase 5E report](plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md) | Durable assignment/service-type/technician handoff exists; field-reporting tables/UI still cannot begin. | Production identity, general audit, private storage, and approved report/retention policy remain unresolved. | Yes |

## Resolved Or Partially Resolved Phase 1 Questions

| Previous question | Status | Resolution location |
| --- | --- | --- |
| Should CMTCommand remain static or move to a framework/backend? | Resolved | [04_SYSTEM_ARCHITECTURE](04_SYSTEM_ARCHITECTURE.md), [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md) |
| Who is the primary buyer and daily user? | Resolved | [01_VISION_AND_PRODUCT_PRINCIPLES](01_VISION_AND_PRODUCT_PRINCIPLES.md), [03_USERS_ROLES_AND_WORKFLOWS](03_USERS_ROLES_AND_WORKFLOWS.md) |
| What is the first real pilot package? | Resolved | [01_VISION_AND_PRODUCT_PRINCIPLES](01_VISION_AND_PRODUCT_PRINCIPLES.md), [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md) |
| What systems are source of truth? | Resolved | [05_DATA_MODEL_AND_INTEGRATIONS](05_DATA_MODEL_AND_INTEGRATIONS.md) |
| What defines Ready, At Risk, and Not Ready? | Partially resolved | [02_DOMAIN_MODEL_AND_GLOSSARY](02_DOMAIN_MODEL_AND_GLOSSARY.md), [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md); numeric thresholds remain open. |
| What authentication and authorization model is required? | Partially resolved | [09_SECURITY_PRIVACY_AND_PERMISSIONS](09_SECURITY_PRIVACY_AND_PERMISSIONS.md); provider and some approval thresholds remain open. |
| What sensitive data is forbidden? | Resolved for category policy | [09_SECURITY_PRIVACY_AND_PERMISSIONS](09_SECURITY_PRIVACY_AND_PERMISSIONS.md); retention/deletion remains open. |
| What deployment, rollback, and health requirements apply? | Partially resolved | [11_DEPLOYMENT_AND_OPERATIONS](11_DEPLOYMENT_AND_OPERATIONS.md); provider and recovery objectives remain open. |
| Should browser/CDP validation become CI enforcement? | Partially resolved | [10_TESTING_AND_ACCEPTANCE](10_TESTING_AND_ACCEPTANCE.md); implementation is not enforced yet. |
| Which workflow becomes fully operational first? | Resolved | [08_FEATURE_CATALOG_AND_STATUS](08_FEATURE_CATALOG_AND_STATUS.md), [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md) |

## Explicit Roadmap

Founder-approved Pilot V1 direction:

- Build Tomorrow Readiness + Coverage Decision System as the first operational product.
- Preserve the current static demo as trusted reference.
- Follow the guarded phases in [Pilot V1 Implementation Sequence](plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md).
- Use [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md) as the boundary decision before architecture implementation.
- Use ADR-002 through ADR-005 and the [Operational vNext Architecture Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md) before Phase 4 scaffolding.
- Use the [Phase 4 Scaffolding Report](plans/PHASE_4_SCAFFOLDING_REPORT.md) before changing `apps/operational/`.
- Use the [Phase 5 Tenancy Foundation Report](plans/PHASE_5_TENANCY_FOUNDATION_REPORT.md) before adding identities, memberships, RBAC, technicians, work orders, imports, readiness, coverage, Decision Log behavior, or audit events.
- Use [ADR-007](decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md) and
  the [Phase 5D report](plans/PHASE_5D_IDENTITY_RBAC_REPORT.md) for every
  protected request, membership mutation, office access, and production auth
  provider decision.
- Use [ADR-008](decisions/ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md)
  and the [Phase 5E report](plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md)
  for service-type ownership, dispatch lifecycle, technician relationships,
  conflict policy, and future Field Operations handoff decisions.

Repository-supported candidate slices recorded in `docs/cmtcommand-vnext/plan.md` remain historical planning evidence:

- Trusted Pilot Intake and Render Safety: selected and implemented in the vNext phase record.
- TRD-104 Guided Buyer Story Hardening: candidate slice.
- Demo QA and Local Reset Gate: candidate slice.
- Operational Impact Proof Pack: candidate slice.

Do not treat old candidate slices as committed roadmap unless they align with the founder-approved Pilot V1 sequence.

Future Field Operations direction:

- Complete the remaining shared Operational vNext prerequisites first:
  production authentication, general audit events, private storage/upload
  authorization, and approved report/retention policy. The local identity/RBAC
  foundation and durable-record P2 gate are implemented.
- Treat [FR-0](plans/FIELD_OPERATIONS_IMPLEMENTATION_PLAN.md) as documentation/architecture complete only.
- Do not begin the concrete-inspection FR-1 vertical slice until every prerequisite gate and organization-specific report requirement is verified.
- Keep FR-2 offline/media resilience, FR-3 additional templates, FR-4 email/Procore adapters, FR-5 plan-location intelligence, and FR-6 advanced analytics deferred.

## Open Questions

### Product

- [OPEN QUESTION - High Impact] What exact operational-impact and time-saved formulas should Pilot V1 use?
- [OPEN QUESTION - High Impact] Should Field Operations become the next major workstream after Pilot V1, or a later controlled extension?
- [OPEN QUESTION - Medium Impact] Which current static-demo prototype surfaces should remain visible while Pilot V1 is built?

### Domain

- [OPEN QUESTION - High Impact] What exact certification-expiration warning threshold should Pilot V1 use?
- [OPEN QUESTION - High Impact] What exact calibration-expiration warning threshold should Pilot V1 use?
- [OPEN QUESTION - High Impact] How should travel-time and turnaround risk be calculated?
- [OPEN QUESTION - High Impact] What coverage-candidate ranking weights should be used?
- [OPEN QUESTION - Medium Impact] Should office boundaries restrict coverage recommendations?
- [OPEN QUESTION - Medium Impact] Should partner-firm personnel be represented in Pilot V1?

### Architecture

- [OPEN QUESTION - High Impact] Which exact managed PostgreSQL provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - High Impact] Which exact managed authentication provider should replace the disabled production boundary before pilot deployment?
- [OPEN QUESTION - High Impact] Which exact managed Next.js hosting provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - High Impact] Which private object-storage and media-inspection approach should Field Operations use after identity and assignment foundations exist?
- [OPEN QUESTION - Medium Impact] When should current demo logic be extracted or shared with operational vNext, if ever?

### Data

- [OPEN QUESTION - High Impact] Should initial imports replace complete snapshots or support incremental updates?
- [OPEN QUESTION - High Impact] What retention and deletion periods apply to customer pilot data?
- [OPEN QUESTION - Medium Impact] Can Project Managers edit imported records directly, or only submit corrections?

### UI

- [OPEN QUESTION - Medium Impact] What accessibility target should future UI work meet?
- [OPEN QUESTION - Medium Impact] What component strategy should operational vNext use?

### Security

- [OPEN QUESTION - High Impact] What approval threshold distinguishes ordinary coverage decisions from significant operational changes?
- [OPEN QUESTION - High Impact] Which persistent security audit-event schema and
  retention policy should receive the structured Phase 5D mutation metadata?
- [OPEN QUESTION - Medium Impact] What safe logging policy applies to pilot data and import failures?
- [OPEN QUESTION - Medium Impact] Should PostgreSQL RLS be enabled before pilot production as defense in depth after the app-owned authorization model exists?

### Operations

- [OPEN QUESTION - High Impact] What database recovery time and recovery point expectations apply to Pilot V1?
- [OPEN QUESTION - Medium Impact] What exact health-check response should represent app and database readiness?

### Testing

- [OPEN QUESTION - High Impact] What exact acceptance fixtures represent a TRD-104-equivalent imported customer scenario?
- [OPEN QUESTION - Medium Impact] Should documentation link validation become a maintained script?
