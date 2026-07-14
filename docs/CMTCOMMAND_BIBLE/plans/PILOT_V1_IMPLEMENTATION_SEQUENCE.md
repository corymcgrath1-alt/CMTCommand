# Pilot V1 Implementation Sequence

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - `AGENTS.md`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `scripts/verify-root.mjs`
  - `docs/CMTCOMMAND_BIBLE/specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md`
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

## Purpose

This sequence guards the transition from static trusted demo to operational Pilot V1. It is not a schedule. Do not estimate calendar duration from this document.

## Phase 0 - Preserve And Baseline The Demo

| Field | Details |
| --- | --- |
| Objective | Keep the current static demo stable before operational work begins. |
| In scope | Record current verified behavior, verification commands, TRD-104/Maria flow, visual modes, local state/reset expectations. |
| Explicitly out of scope | Backend, auth, database, framework scaffolding, product behavior changes. |
| Dependencies | Current root app and `node scripts\verify-root.mjs`. |
| Principal risks | Breaking the trusted demo while planning vNext; losing current visual baseline. |
| Required artifacts | Demo baseline note, current command list, TRD-104 golden-path checklist. |
| Entry criteria | Clean understanding of current dirty worktree and unrelated files. |
| Exit criteria | Baseline documented and root verifier passing. |
| Verification requirements | `node scripts\verify-root.mjs`; browser smoke if visual baseline is recorded. |
| Stop conditions | Current demo fails verifier; unrelated worktree changes overlap required files. |

## Phase 1 - Architecture Selection

| Field | Details |
| --- | --- |
| Objective | Choose the operational implementation stack without rewriting the demo in place. |
| In scope | Compare framework, database, auth, hosting, testing, deployment, observability, and data-boundary options; write ADRs. |
| Explicitly out of scope | Broad product implementation, migrations with customer data, live integrations. |
| Dependencies | [ADR-001](../decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md), Pilot V1 spec, deployment/security requirements. |
| Principal risks | Selecting tools implicitly through scaffolding; choosing vendor before requirements are evaluated. |
| Required artifacts | Architecture ADRs, stack comparison, environment plan, testing strategy. |
| Entry criteria | Demo baseline complete. |
| Exit criteria | Approved architecture decisions identify framework, database, auth, hosting, and verification approach. |
| Verification requirements | Documentation review, link validation, no production app diffs unless explicitly scoped. |
| Stop conditions | Stack choice would require altering current demo behavior or adding production code before decision approval. |

Phase 3 architecture selection produced ADR-002 through ADR-005, the [Operational vNext Architecture Blueprint](OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md), and the [Phase 4 Scaffolding Readiness Checklist](PHASE_4_SCAFFOLDING_READINESS_CHECKLIST.md). It selected a full-stack TypeScript modular monolith in future `apps/operational/`, Next.js App Router on Node.js, PostgreSQL, Drizzle, Zod, Vitest, Playwright, managed auth category, server-side app-owned authorization, and database-tracked imports.

Phase 4 scaffolding later created `apps/operational/` with an app-local npm
manifest, lockfile, Next.js App Router shell, health routes, lazy
Drizzle/PostgreSQL wiring, Vitest tests, Playwright smoke tests, and scoped CI.
See [Phase 4 Scaffolding Report](PHASE_4_SCAFFOLDING_REPORT.md). No Pilot V1
business behavior was implemented.

## Phase 2 - Operational Data Foundation

| Field | Details |
| --- | --- |
| Objective | Define and implement persistent foundations for Pilot V1 data. |
| In scope | Organizations, offices, users, roles, technicians, certifications, clearances, equipment, calibrations, work orders, projects, job sites, service requirements, assignments. |
| Explicitly out of scope | Deep integrations, billing/payroll/CRM/LIMS, full project management, field mobile app. |
| Dependencies | Architecture selection and data model decisions. |
| Principal risks | Weak tenant/office isolation; under-modeled readiness inputs; over-collecting sensitive data. |
| Required artifacts | Schema/model definitions, migrations, seed fixtures, data dictionary, retention assumptions. |
| Entry criteria | Approved stack and data-boundary decisions. |
| Exit criteria | Persistent model supports Pilot V1 required inputs with organization/office scoping. |
| Verification requirements | Migration tests, model tests, permission scoping tests, data-minimization review. |
| Stop conditions | Schema requires forbidden sensitive data or lacks organization/office scoping. |

## Phase 3 - Controlled Import Pipeline

| Field | Details |
| --- | --- |
| Objective | Bring Pilot V1 data into the system safely through controlled CSV/XLSX imports. |
| In scope | CSV/XLSX ingestion, column mapping, required-field validation, duplicate detection, sensitive-column detection, preview, error reporting, import history. |
| Explicitly out of scope | Deep real-time integrations, silent writeback, automatic source-system mutation. |
| Dependencies | Operational data foundation, sensitive-data policy, import UX decisions. |
| Principal risks | Ingesting prohibited data; accepting malformed data; losing source-of-truth boundaries. |
| Required artifacts | Import format contracts, validation rules, import-history model, data-quality report definitions. |
| Entry criteria | Core entities and organization/office scoping exist. |
| Exit criteria | Valid imports persist with history; invalid/sensitive imports are blocked or reported. |
| Verification requirements | Valid, malformed, missing-column, duplicate, sensitive-column, unexpected-column, and secret-like-value tests. |
| Stop conditions | Imports can bypass preview/validation or write outside the authenticated organization/office. |

## Phase 4 - Deterministic Readiness Engine

| Field | Details |
| --- | --- |
| Objective | Calculate Ready, At Risk, and Not Ready with deterministic rule explanations. |
| In scope | Rule evaluation, hard-failure precedence, warnings, explanation payloads, readiness snapshots, recalculation dependencies, regression fixtures. |
| Explicitly out of scope | Coverage approval UI, ranking weights not yet approved, ROI formulas. |
| Dependencies | Data foundation, import pipeline, readiness rule definitions. |
| Principal risks | Hidden heuristics, untestable status logic, hardcoded demo records. |
| Required artifacts | Rule catalog, unit tests, snapshot schema, TRD-104-equivalent imported fixture. |
| Entry criteria | Required input data can be imported and persisted. |
| Exit criteria | Readiness snapshots are deterministic and explain every status. |
| Verification requirements | Unit tests for each hard failure and warning; precedence tests; snapshot/recalculation tests. |
| Stop conditions | Rule results cannot identify rule, input, result, severity, explanation, and remediation path. |

## Phase 5 - Coverage Decision Workflow

| Field | Details |
| --- | --- |
| Objective | Resolve readiness failures through eligible coverage recommendations and auditable approvals. |
| In scope | Candidate eligibility, recommendation evidence, cascading impact, approval, recalculation, Decision Log. |
| Explicitly out of scope | Partner-firm coverage unless approved, deep dispatch platform behavior, field technician mobile flows. |
| Dependencies | Readiness engine, role permissions, Decision Log model. |
| Principal risks | Moving one assignment creates hidden downstream Not Ready work; approvals are not auditable. |
| Required artifacts | Coverage eligibility tests, cascading-impact tests, approval tests, Decision Log schema. |
| Entry criteria | Deterministic readiness snapshots exist. |
| Exit criteria | Coverage decisions recalculate affected work and append auditable decisions. |
| Verification requirements | End-to-end domain test for imported TRD-104-equivalent scenario; allowed/denied approval tests. |
| Stop conditions | Approval can erase history or leave affected work orders unrecalculated. |

## Phase 6 - Pilot User Experience

| Field | Details |
| --- | --- |
| Objective | Build the operational surfaces needed for daily Pilot V1 use. |
| In scope | Tomorrow Readiness board, action queue, Find Coverage, Decision history, data-quality views, operational-impact views, import preview/history. |
| Explicitly out of scope | Full dispatch platform, executive analytics dashboard, native mobile, CRM/billing/payroll/LIMS. |
| Dependencies | Import pipeline, readiness engine, coverage workflow, UI decisions. |
| Principal risks | Optimizing passive reporting over operational action; drifting from static demo visual baseline. |
| Required artifacts | UI flows, state inventory, browser tests, accessibility notes. |
| Entry criteria | Core domain workflows are testable without UI. |
| Exit criteria | Primary users can complete the first operational workflow in the app. |
| Verification requirements | Browser/end-to-end test for import -> readiness -> coverage -> approval -> decision -> impact; responsive checks. |
| Stop conditions | UI presents target behavior that backend/domain logic does not enforce. |

## Phase 7 - Security And Pilot Operations

| Field | Details |
| --- | --- |
| Objective | Make Pilot V1 safe enough for invite-only operational pilot use. |
| In scope | Authentication, authorization, organization scoping, audit behavior, logging, backup, recovery, health checks, staging, pilot production. |
| Explicitly out of scope | Enterprise SSO unless selected, broad compliance claims, unsupported monitoring promises. |
| Dependencies | Architecture selection, roles/permissions, deployment provider, data model. |
| Principal risks | Cross-tenant access, weak audit, unprotected secrets, unrecoverable data. |
| Required artifacts | Auth/RBAC tests, environment docs, backup/recovery docs, health endpoints, logging policy. |
| Entry criteria | Operational app can run in selected architecture. |
| Exit criteria | Staging and pilot-production paths meet minimum security and operations requirements. |
| Verification requirements | Allowed/denied permission tests, secret/config review, health checks, backup and recovery drill, rollback exercise. |
| Stop conditions | Any read/write can escape organization/office scope; secrets or sensitive data appear in tracked files/logs. |

## Phase 8 - Pilot Validation And Release

| Field | Details |
| --- | --- |
| Objective | Validate Pilot V1 against founder-approved workflow and release criteria. |
| In scope | Seeded end-to-end scenario, TRD-104-equivalent imported scenario, permission tests, import failure tests, browser validation, pilot acceptance checklist, rollback exercise. |
| Explicitly out of scope | New feature expansion, enterprise rollout, deep integrations. |
| Dependencies | Phases 0 through 7. |
| Principal risks | Passing narrow happy paths while import, permission, or rollback failures remain untested. |
| Required artifacts | Acceptance report, release checklist, known limitations, rollback evidence, pilot runbook. |
| Entry criteria | Functional, security, and operations phases are complete. |
| Exit criteria | Pilot V1 is ready for controlled single-office use with documented caveats. |
| Verification requirements | Full end-to-end verification, root demo verifier, operational tests, browser validation, health checks, rollback/recovery evidence. |
| Stop conditions | Flaky browser checks are proposed as blocking before stabilization; critical open security/data questions remain unresolved. |

## Cross-Phase Rules

- Do not change the static demo unless a phase explicitly scopes it.
- Do not hardcode TRD-104 or Maria Lopez in Pilot V1 production logic.
- Do not add forbidden sensitive data requirements.
- Do not choose vendors by accident through scaffolding.
- Do not describe target state as implemented until verified by code/tests.

## Next Guarded Phase

The guarded operational application shell now exists. The next smallest
implementation phase should be the organization and office tenancy foundation:
persistent organization/office schema, migrations, scoped data-access helpers,
and isolation tests. Do not add technicians, work orders, imports, readiness
rules, coverage, Decision Log behavior, or audit events until the tenancy
boundary is persisted and tested.

## Remaining Open Questions

- [OPEN QUESTION - High Impact] Which exact managed auth, database, and hosting providers should be selected before real pilot deployment configuration?
- [OPEN QUESTION - High Impact] What exact readiness-warning thresholds and coverage-ranking weights should be approved before Phase 4/5?
- [OPEN QUESTION - High Impact] What recovery objectives and retention/deletion periods are required before Phase 7?
- [OPEN QUESTION - Medium Impact] Which static-demo assets or logic should be shared with operational vNext, if any?
