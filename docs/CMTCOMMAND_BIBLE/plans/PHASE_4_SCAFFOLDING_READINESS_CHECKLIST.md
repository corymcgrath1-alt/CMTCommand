# Phase 4 Scaffolding Readiness Checklist

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-003_OPERATIONAL_VNEXT_REPOSITORY_BOUNDARY.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-005_IMPORT_AND_READINESS_EXECUTION_MODEL.md`
  - `docs/CMTCOMMAND_BIBLE/plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md`
  - `docs/CMTCOMMAND_BIBLE/plans/PHASE_4_SCAFFOLDING_REPORT.md`
  - `apps/operational/`
- Last Reviewed: 2026-07-13

## Purpose

This checklist is the hard gate before creating any operational application shell. It permits only guarded scaffolding: prove the app boundary, database/test/deployment toolchain, and no business features.

## Confirmed Architecture Choices

| Area | Required confirmation | Status |
| --- | --- | --- |
| Application architecture | Full-stack TypeScript modular monolith. | Confirmed for scaffolding. |
| Repository boundary | Future `apps/operational/`; do not move root demo. | Confirmed for scaffolding. |
| Framework/runtime | Next.js App Router on Node.js runtime. | Confirmed for scaffolding. |
| Database category | PostgreSQL or PostgreSQL-compatible managed relational database. | Confirmed for scaffolding. |
| Data-access/migrations | Drizzle ORM and Drizzle Kit migrations. | Confirmed for scaffolding. |
| Authentication category | Managed identity provider integrated with app-owned membership/RBAC. | Category confirmed; exact provider deferred. |
| Authorization approach | Server-side policy module plus scoped data-access helpers. | Confirmed for scaffolding. |
| Validation approach | Zod at API/action/import boundaries; domain invariants in domain modules. | Confirmed for scaffolding. |
| Test stack | Vitest for unit/integration target; Playwright for browser/E2E target. | Confirmed for scaffolding. |
| Deployment category | Managed Next.js-capable host plus managed PostgreSQL. | Category confirmed; exact provider deferred. |
| Local development | App-local Node/npm toolchain; local or managed dev PostgreSQL. | Confirmed for scaffolding. |
| Environment variables | App-local `.env.example` only after scaffolding; no root env. | Confirmed for scaffolding. |
| Database test strategy | Test database with migration reset/transaction isolation. | Confirmed for scaffolding. |
| Pilot environment strategy | Dev, staging, pilot production. | Confirmed; actual deployment config deferred. |
| Import execution | Database-tracked in-app processing; no distributed queue by default. | Confirmed for scaffolding. |
| Audit strategy | Decision Log and audit events separate; append-only history. | Confirmed for scaffolding. |
| Static-demo preservation | Root files untouched; root verifier remains separate. | Confirmed for scaffolding. |

## Initial Module List

Architecture planning identified these eventual module boundaries:

- identity-access
- organizations-offices
- people-readiness
- equipment-readiness
- work-orders
- service-requirements
- imports
- readiness-engine
- coverage-decisions
- decision-log-audit
- data-quality
- operational-impact

Do not implement business behavior in the scaffolding phase.

Phase 4 did not create these domain module folders because the execution prompt
prohibited empty domain placeholders. That is consistent with the scaffold
boundary: only environment, database, health, app shell, tests, and toolchain
files were created.

## Initial Acceptance Criteria For Scaffolding

1. `apps/operational/` exists and the root static demo remains at the repository root.
2. Root demo still runs and verifies with `node scripts\verify-root.mjs`.
3. Operational app has its own package manifest and lockfile under `apps/operational/`.
4. Operational app can run a minimal local development server.
5. Operational app can run typecheck, lint, unit test, and build commands.
6. Operational app can connect to a development/test PostgreSQL database through a lazy database client pattern.
7. Migration tooling can create and verify an empty or initial metadata migration without customer data.
8. Health route or equivalent returns app liveness and database connectivity status.
9. The readiness engine package/module can run a placeholder unit test without importing framework, database, auth, or network code.
10. No Pilot V1 business feature, schema for real customer entities, auth provider config, deployment config, or production integration is implemented unless a later prompt scopes it.

## Phase 4 Result - 2026-07-13

| Acceptance item | Result |
| --- | --- |
| `apps/operational/` exists and root demo remains in place. | Passed. |
| Root demo verifies with `node scripts\verify-root.mjs`. | Passed before scaffolding. |
| Operational app has local manifest and lockfile. | Passed. |
| Operational app can run a local development server. | Passed through Playwright web-server startup. |
| Typecheck, lint, unit test, and build commands work. | Passed through `npm run verify`. |
| Lazy PostgreSQL connectivity path exists. | Passed at wiring level; real database smoke remains unrun without `TEST_DATABASE_URL`. |
| Migration tooling configured without customer data. | Partially passed; Drizzle Kit is configured, but no schema or migration execution exists yet. |
| Health route returns app liveness and database connectivity status. | Passed through unit and Playwright tests. |
| Readiness engine placeholder unit test exists. | Intentionally not created; no readiness module exists in Phase 4. |
| No Pilot V1 business feature or production integration is implemented. | Passed. |

## Known Open Questions That Block Scaffolding

None, if Phase 4 is limited to guarded scaffolding and does not implement business features, real auth, deployment, or customer data.

## Known Questions That May Safely Remain Deferred

- Exact managed authentication provider.
- Exact managed hosting provider.
- Exact managed PostgreSQL provider.
- Exact CSV/XLSX parser packages.
- Exact warning thresholds for certification/calibration risk.
- Exact travel/turnaround calculation.
- Coverage-candidate ranking weights.
- Significant-change approval threshold.
- Operational-impact formula.
- Snapshot replacement versus incremental import policy.
- Raw-file retention/deletion periods.
- RPO/RTO values.
- Whether PostgreSQL RLS is enabled during scaffolding or before pilot production.
- Whether Project Managers can directly edit imported records.
- Whether partner-firm personnel are represented in Pilot V1.

## Stop Conditions For Phase 4

Stop before scaffolding if:

- The current static demo has uncommitted overlapping changes in files the scaffolding command would touch.
- Scaffolding would need to run in repository root or move root demo files.
- The selected app directory already exists with conflicting content.
- A tool requires adding root package manifests or lockfiles without explicit approval.
- Real credentials, customer data, or deployment resources are required.
- Scaffolding would implement business features rather than proving the toolchain.

## Conclusion

```text
Architecture Ready for Guarded Scaffolding
```

Justification: the architecture has selected the application structure, repository boundary, framework/runtime, database direction, migration approach, validation approach, testing stack, authorization model, import execution model, and static-demo preservation rules. Provider-specific choices can remain deferred because the next phase should only create the operational application shell and prove local database/test/build/health tooling, not deploy production or implement business features.
