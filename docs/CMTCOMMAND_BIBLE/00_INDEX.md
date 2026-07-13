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
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
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
- `euchre-platform/` and `brackethub/` are unrelated to root CMTCommand scope based on `AGENTS.md`, `MIGRATION_CLEANUP_REPORT.md`, and vNext docs.
- `node scripts\verify-root.mjs` is the root verification command found in repository evidence.

## Founder Decision - 2026-07-13

- CMTCommand is an Engineering Testing Operations Command Center.
- The first operational wedge is Tomorrow Readiness + Coverage Decision System.
- The current static app remains the trusted demo, product-reference implementation, and visual behavior baseline.
- Pilot V1 is a 90-day, single-office Tomorrow Readiness and Coverage pilot.
- The operational product needs a backend-backed implementation, but the exact framework, database, auth provider, and hosting provider remain unresolved until a guarded architecture phase.

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

- [OPEN QUESTION - High Impact] Which operational framework should be selected for the bounded Pilot V1 implementation?
- [OPEN QUESTION - High Impact] Which database provider should hold Pilot V1 persistent data?
- [OPEN QUESTION - High Impact] Which authentication provider should support invite-only, organization-scoped access?
- [OPEN QUESTION - High Impact] Which managed hosting provider should satisfy Pilot V1 deployment, backup, monitoring, and rollback requirements?
- [OPEN QUESTION - High Impact] Should Pilot V1 imports replace complete source snapshots or support incremental updates?
