# CMTCommand Bible Index

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `AGENTS.md`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/cmtcommand-vnext/`
  - `index.html`
  - `app.js`
  - `styles.css`
  - `scripts/verify-root.mjs`
  - `.github/workflows/root-static-checks.yml`
  - `apps/operational/`
  - `.github/workflows/operational-ci.yml`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

## Purpose

This Bible is the durable repository-native operating system for root CMTCommand. It gives future Codex sessions and human engineers a concise, evidence-backed way to understand how to work in the repository, what the current static demo proves, what the founder has approved for Pilot V1, and what remains unresolved.

When documentation conflicts with executable current behavior, investigate the conflict. Do not silently choose the older doc or the newer code.

## Intended Audience

- Future Codex sessions.
- Human contributors.
- Product owners deciding unresolved product/domain questions.
- Reviewers checking whether a change fits root CMTCommand.

## Scope Labels

Use these labels when a document could confuse current behavior with target direction:

- Current Demo: behavior confirmed in the existing static HTML/CSS/JavaScript app.
- Pilot V1 Target: founder-approved product direction for the 90-day operational pilot; not necessarily implemented.
- Future: explicitly deferred behavior beyond Pilot V1.
- Open Question: information still requiring a decision.

Founder decisions dated 2026-07-13 are authoritative product-direction evidence, not proof of current implementation.

## Document Map

| Subject | Governing document |
| --- | --- |
| Navigation, evidence rules, maintenance | [00_INDEX](00_INDEX.md) |
| Product purpose and principles | [01_VISION_AND_PRODUCT_PRINCIPLES](01_VISION_AND_PRODUCT_PRINCIPLES.md) |
| Domain terms | [02_DOMAIN_MODEL_AND_GLOSSARY](02_DOMAIN_MODEL_AND_GLOSSARY.md) |
| Roles and workflows | [03_USERS_ROLES_AND_WORKFLOWS](03_USERS_ROLES_AND_WORKFLOWS.md) |
| Runtime architecture | [04_SYSTEM_ARCHITECTURE](04_SYSTEM_ARCHITECTURE.md) |
| Data model and integrations | [05_DATA_MODEL_AND_INTEGRATIONS](05_DATA_MODEL_AND_INTEGRATIONS.md) |
| Engineering standards | [06_ENGINEERING_STANDARDS](06_ENGINEERING_STANDARDS.md) |
| UI/design system | [07_UI_AND_DESIGN_SYSTEM](07_UI_AND_DESIGN_SYSTEM.md) |
| Feature inventory | [08_FEATURE_CATALOG_AND_STATUS](08_FEATURE_CATALOG_AND_STATUS.md) |
| Security, privacy, permissions | [09_SECURITY_PRIVACY_AND_PERMISSIONS](09_SECURITY_PRIVACY_AND_PERMISSIONS.md) |
| Testing and acceptance | [10_TESTING_AND_ACCEPTANCE](10_TESTING_AND_ACCEPTANCE.md) |
| Deployment and operations | [11_DEPLOYMENT_AND_OPERATIONS](11_DEPLOYMENT_AND_OPERATIONS.md) |
| Decisions, roadmap, questions | [12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS](12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS.md) |

Pilot V1 additions:

- [Pilot V1 Feature Specification](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md): read before operational product design or implementation.
- [ADR-001 Preserve Static Demo And Build Operational vNext](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md): read before changing architecture or proposing a backend path.
- [Pilot V1 Implementation Sequence](plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md): read before sequencing operationalization work.

Operational vNext architecture:

- [ADR-002 Operational vNext Application Architecture](decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md): governs app architecture, stack direction, module boundaries, and deployment category.
- [ADR-003 Operational vNext Repository Boundary](decisions/ADR-003_OPERATIONAL_VNEXT_REPOSITORY_BOUNDARY.md): governs where the operational app will live and how the static demo stays isolated.
- [ADR-004 Tenancy Authorization And Audit Model](decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md): governs auth, membership, RBAC, office scope, Decision Log distinction, and audit model.
- [ADR-005 Import And Readiness Execution Model](decisions/ADR-005_IMPORT_AND_READINESS_EXECUTION_MODEL.md): governs imports, readiness execution, snapshots, recalculation, and queue threshold.
- [Operational vNext Architecture Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md): canonical technical overview.
- [Phase 4 Scaffolding Readiness Checklist](plans/PHASE_4_SCAFFOLDING_READINESS_CHECKLIST.md): gate before creating the operational app shell.
- [Phase 4 Scaffolding Report](plans/PHASE_4_SCAFFOLDING_REPORT.md): read for the implemented shell, exact package versions, commands, health behavior, and verification results.

Templates:

- [Feature Specification Template](templates/FEATURE_SPEC_TEMPLATE.md)
- [Architecture Decision Template](templates/ARCHITECTURE_DECISION_TEMPLATE.md)
- [Bug Fix Template](templates/BUG_FIX_TEMPLATE.md)
- [Code Review Checklist](templates/CODE_REVIEW_CHECKLIST.md)

## Recommended Reading Order

For any nontrivial work, read:

1. [AGENTS.md](../../AGENTS.md)
2. This index
3. [06_ENGINEERING_STANDARDS](06_ENGINEERING_STANDARDS.md)
4. [10_TESTING_AND_ACCEPTANCE](10_TESTING_AND_ACCEPTANCE.md)
5. The chapter specific to the task

For Pilot V1 operational work, also read [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md), the [Pilot V1 spec](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md), and the [implementation sequence](plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md).

For operational app scaffolding or architecture work, also read ADR-002 through ADR-005, the [Architecture Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md), the [Phase 4 Checklist](plans/PHASE_4_SCAFFOLDING_READINESS_CHECKLIST.md), and the [Phase 4 Scaffolding Report](plans/PHASE_4_SCAFFOLDING_REPORT.md).

## Evidence And Confidence Conventions

Use this hierarchy:

1. Executable tests and schemas.
2. Current production source code.
3. Current configuration and deployment files.
4. Founder decisions dated 2026-07-13 for product direction.
5. Existing maintained documentation.
6. Comments and TODO-style markers.
7. Reasonable inference.

Each chapter uses:

- Confirmed: directly supported by repository evidence.
- Founder Decision: product direction explicitly provided by the founder.
- Inferred: strongly suggested but not directly specified.
- Open Questions: information that cannot be determined safely from evidence.

Do not treat inferred statements as product commitments. Do not treat founder target decisions as implemented behavior.

## Confirmed

- Root CMTCommand is a static HTML/CSS/JavaScript app served from the repository root.
- There is no root `package.json`, package lockfile, backend, database, auth service, deployment config, or migration system found in root scope.
- Operational vNext now has an app-local scaffold under `apps/operational/` with its own npm manifest, lockfile, Next.js App Router shell, health endpoints, Drizzle/PostgreSQL wiring, Vitest tests, Playwright smoke tests, and scoped CI workflow.
- `euchre-platform/` and `brackethub/` are unrelated to root CMTCommand scope based on `AGENTS.md`, `MIGRATION_CLEANUP_REPORT.md`, and vNext docs.
- `node scripts\verify-root.mjs` is the root verification command found in repository evidence.

## Founder Decision - 2026-07-13

- CMTCommand is an Engineering Testing Operations Command Center.
- The first operational wedge is Tomorrow Readiness + Coverage Decision System.
- The current static app remains the trusted demo, product-reference implementation, and visual behavior baseline.
- Pilot V1 is a 90-day, single-office Tomorrow Readiness and Coverage pilot.
- The operational product needs a backend-backed implementation. Phase 3 selected the architecture category and core stack; exact managed auth, database, and hosting providers remain checkpoints.

## Architecture Decision - 2026-07-13

- Operational vNext should be a full-stack TypeScript modular monolith.
- It should use Next.js App Router on the Node.js runtime.
- It lives in `apps/operational/` without moving the root static demo.
- It should use PostgreSQL or a PostgreSQL-compatible managed relational database.
- It should use Drizzle ORM and Drizzle Kit migrations.
- It should isolate readiness logic as pure deterministic TypeScript.
- It should use managed authentication as an identity boundary and app-owned server-side authorization for organization, office, role, and audit behavior.
- It should start imports as database-tracked in-app processing, not distributed queue infrastructure.

## Maintenance Expectations

Update the relevant chapter when a change materially alters:

- Domain terminology.
- Architecture or script load order.
- Data models, import/export shapes, or integrations.
- Permissions or trust boundaries.
- User workflows or feature status.
- UI conventions.
- Development, testing, deployment, or CI commands.
- Durable product or technical decisions.

Do not update unrelated chapters merely to create activity.

## Contradictions

If two sources conflict:

1. Check executable code/tests first for current behavior.
2. Check current config.
3. Check founder decisions for target direction.
4. Check maintained docs.
5. Record whether the conflict is a current-behavior bug, an implementation gap, or stale documentation.
6. Fix the stale source only if the task scope allows documentation cleanup.

## Resolved Phase 1 Questions

The founder decisions resolved the previous highest-impact questions about static versus backend direction, primary buyer, pilot package, source of truth, readiness rules, authorization, sensitive data, deployment requirements, browser validation policy, and first operational workflow. The canonical resolution table lives in [12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS](12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS.md).

## High-Impact Open Questions

- [OPEN QUESTION - High Impact] Which exact managed authentication provider should be selected before auth scaffolding?
- [OPEN QUESTION - High Impact] Which exact managed PostgreSQL provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - High Impact] Which exact managed Next.js hosting provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - High Impact] Should Pilot V1 imports replace complete source snapshots or support incremental updates?
