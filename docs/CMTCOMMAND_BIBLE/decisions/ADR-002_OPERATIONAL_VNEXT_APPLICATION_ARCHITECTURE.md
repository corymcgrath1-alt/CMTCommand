# ADR-002 Operational vNext Application Architecture

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
  - `AGENTS.md`
  - `README.md`
  - `scripts/verify-root.mjs`
  - `.github/workflows/root-static-checks.yml`
  - `docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md`
  - `docs/CMTCOMMAND_BIBLE/specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md`
  - Next.js App Router documentation: `https://nextjs.org/docs/app`
  - Drizzle ORM documentation: `https://orm.drizzle.team/docs/overview`
  - PostgreSQL documentation: `https://www.postgresql.org/docs/`
- Last Reviewed: 2026-07-13

## Context

The current root CMTCommand app is a static HTML/CSS/JavaScript demo with no root package manifest, backend, database, authentication, deployment configuration, or migration system. Founder direction now requires an operational Pilot V1 with persistent data, authentication, role-based authorization, organization and office scoping, durable imports, readiness snapshots, auditable Decision Log history, managed deployment, backups, rollback, and monitoring.

ADR-001 protects the static demo from an uncontrolled rewrite. Operational vNext therefore needs a separate architecture that can be implemented without moving or converting the current demo.

## Requirements

- Preserve the root static demo as independently runnable and independently verifiable.
- Build Operational vNext as a modular monolith, not microservices.
- Use TypeScript end to end.
- Use PostgreSQL or a PostgreSQL-compatible managed relational database.
- Keep readiness and coverage logic as deterministic domain logic independent of UI, route handlers, database queries, ORM hooks, auth providers, and network services.
- Enforce authorization server-side.
- Persist append-only Decision Log and audit history.
- Support controlled CSV/XLSX imports with preview, confirmation, row outcomes, retry behavior, and history.
- Prefer managed operations with low pilot burden.

## Constraints

- Do not create application scaffolding in this phase.
- Do not add package manifests, dependencies, schemas, migrations, auth config, routes, or deployment config in this phase.
- Do not touch `app.js`, `styles.css`, `index.html`, root utilities, root tests, root scripts, workflows, lockfiles, or `euchre-platform/`.
- Do not treat recommended technologies as current implementation.

## Options Considered

### Option A - Full-Stack TypeScript Framework

A full-stack TypeScript web application with server-rendered UI, server-side application behavior, Route Handlers or server actions, PostgreSQL, and managed authentication.

### Option B - Separate TypeScript Frontend And Backend

A separately deployed frontend and Node.js backend API with PostgreSQL and managed authentication.

### Option C - Static Demo With Separate Operational API And Incremental UI

Keep the current static interface as the primary UI while introducing a separate backend and progressively attaching operational behavior.

## Weighted Decision Matrix

Scores are 1 to 5. Weighted total maximum is 385.

| Criterion | Weight | Option A | Option B | Option C | Reasoning |
| --- | ---: | ---: | ---: | ---: | --- |
| Pilot delivery speed | 5 | 4 | 3 | 3 | A has one app boundary; B adds API/client coordination; C must bridge old static UI to new backend. |
| Preserve existing demo | 5 | 5 | 5 | 2 | A and B can leave root untouched; C risks binding operational behavior to demo-only UI. |
| Architectural clarity | 4 | 4 | 3 | 2 | A supports one modular app; B splits runtime concerns early; C mixes demo and production assumptions. |
| Testability | 5 | 4 | 4 | 2 | A and B can isolate domain logic; C makes UI/backend seams harder to prove. |
| Type safety | 4 | 4 | 4 | 2 | A and B can share TypeScript contracts; C must cross a JavaScript static boundary. |
| Authorization enforcement | 5 | 4 | 4 | 2 | A and B can enforce server-side; C risks client-side drift from static UI. |
| Import processing | 4 | 4 | 4 | 3 | A and B can process server-side; C can but with more UI/API stitching. |
| Deployment simplicity | 5 | 5 | 2 | 3 | A is one primary deployable; B is at least two; C adds backend plus legacy static hosting. |
| Operational burden | 5 | 5 | 2 | 3 | A keeps one runtime to operate; B increases monitoring/deploy surface. |
| Debuggability | 3 | 4 | 3 | 2 | A keeps request, domain, and persistence paths together. |
| Long-term maintainability | 4 | 4 | 3 | 2 | A provides explicit modules without distributed system overhead. |
| Multiple organizations later | 4 | 4 | 4 | 2 | A and B can model tenancy cleanly in app/database. |
| Migration and rollback risk | 4 | 4 | 3 | 2 | A can coexist beside demo; B has more moving parts; C risks demo regression. |
| Visual drift risk | 3 | 3 | 3 | 4 | C reuses more static UI initially but at the cost of product correctness. |
| Duplicated behavior risk | 3 | 3 | 2 | 1 | A can centralize domain/UI contracts; C duplicates demo behavior and backend behavior. |
| Founder learning suitability | 4 | 4 | 2 | 2 | A is one coherent app to inspect; B and C require more systems reasoning. |
| Cost and vendor dependence | 3 | 3 | 3 | 3 | All options can use managed infrastructure with similar pilot cost exposure. |
| Local development complexity | 4 | 4 | 2 | 3 | A is one local app plus database; B is frontend plus backend; C is static server plus backend. |
| Windows development compatibility | 3 | 4 | 3 | 3 | A can use standard Node/npm/TypeScript tooling in one app. |
| **Weighted total** |  | **314** | **242** | **186** | Option A is selected. |

## Selected Architecture

Operational vNext should be a full-stack TypeScript modular monolith using Next.js App Router on the Node.js runtime, with PostgreSQL as the system of record for operational data and a pure TypeScript readiness engine isolated from framework and persistence code.

This is an architecture recommendation and target-state decision. It is not implemented in the repository.

## Selected Technical Stack Or Narrowed Stack

| Area | Selection | Why it fits Pilot V1 | Alternatives considered | Tradeoffs and unresolved items |
| --- | --- | --- | --- | --- |
| Application framework | Next.js App Router | Full-stack TypeScript, server-rendered operational UI, Route Handlers for imports/health, Server Actions or form actions for first-party mutations. | Remix, SvelteKit, separate React SPA plus Express/Fastify API. | Next.js has framework-specific security and upgrade discipline; keep domain logic framework-independent. |
| Runtime | Node.js runtime | Works with PostgreSQL drivers, file parsing, auth libraries, and Windows local development. | Edge runtime, Deno, Bun. | Avoid Edge-only paths for import processing and database work. |
| UI rendering | Server-rendered operational UI with client islands for interactive tables/forms | Keeps data fetching and authorization close to server logic while preserving responsive UX. | Pure SPA, static UI with API, mostly client-side rendering. | Must keep client components small and never rely on hidden buttons as auth. |
| API/action boundary | Server Actions for simple first-party mutations; Route Handlers for imports, health, webhooks, and larger request bodies | Matches framework boundaries while keeping import and health endpoints explicit. | REST-only API, GraphQL, tRPC. | Route/Action handlers must delegate to service/domain modules and re-check authorization. |
| Database | Managed PostgreSQL or PostgreSQL-compatible service | Relational model matches organizations, offices, users, roles, work orders, assignments, snapshots, decisions, and audits. | Document database, SQLite, hosted spreadsheet. | Provider choice remains a checkpoint; do not use customer-visible work-order numbers as primary keys. |
| ORM/query layer | Drizzle ORM with Drizzle Kit migrations; raw SQL allowed for complex reporting where reviewed | SQL-shaped TypeScript model, explicit migrations, avoids treating generated DB types as the domain model. | Prisma, Kysely, node-postgres only. | Drizzle requires disciplined repository boundaries and migration review. |
| Validation | Zod schemas at import/API/action boundaries | Shared TypeScript-friendly runtime validation for untrusted inputs. | Valibot, custom validation. | Domain invariants still live in domain modules, not only Zod schemas. |
| Authentication | Managed identity provider integrated through the Next.js app; exact provider checkpoint before auth scaffolding | Offloads credential handling while app owns memberships, roles, and office scope. | Auth.js-only email sessions, Clerk, Auth0, WorkOS, Supabase Auth. | Exact provider requires account/security/vendor review; Phase 4 shell can proceed with an auth boundary interface. |
| Authorization | App-owned RBAC/ABAC policy module plus scoped data-access helpers | Keeps organization/office checks reusable, testable, and audited. | Client route guards, middleware-only auth, ad hoc checks. | Database RLS should be evaluated as defense-in-depth before pilot production. |
| Unit/integration tests | Vitest for TypeScript unit and service tests | Fast tests for deterministic domain logic and service boundaries. | Node test runner, Jest. | Exact package install happens in scaffolding phase. |
| Browser/E2E tests | Playwright for operational UI and seeded TRD-104-equivalent scenario | Standard browser automation for UI, permissions, imports, and workflows. | Existing CDP script only, Cypress. | Browser gate should follow Phase 2 stability policy before becoming blocking. |
| File parsing | Server-side CSV/XLSX import module with dedicated parser libraries selected during dependency review | Keeps untrusted file handling off the client and inside a testable import boundary. | Browser-only parsing, direct spreadsheet-as-database. | Exact CSV/XLSX packages require license/security review during scaffolding. |
| File storage | Do not retain raw files by default; persist metadata, checksum, row outcomes, and normalized records; optional private object storage only after retention approval | Minimizes sensitive raw-file retention while preserving auditability. | Store every raw upload indefinitely, never store any import evidence. | Raw-file retention duration remains a product/security decision. |
| Background jobs | Start with in-app, database-tracked import jobs for confirmed imports; no distributed queue for Pilot V1 | Reliable enough for bounded pilot imports without queue infrastructure. | Synchronous-only request processing, managed queue. | Add queue only when measured imports exceed platform/runtime limits or need durable async workers. |
| Logging/errors | Structured application logs with request id, organization id, office id, actor id, import id, decision id where safe | Supports audit and troubleshooting without logging sensitive rows. | Console-only logs, full payload logging. | Exact provider/export target remains deployment checkpoint. |
| Deployment | Managed Next.js-capable platform plus managed PostgreSQL | Low operational burden, HTTPS, deployment history, rollback, env secrets. | Self-managed VM, Kubernetes, split frontend/backend hosting. | Phase 5H approves managed-provider categories but not specific vendors; Phase 5I must compare current provider evidence before selection. |
| Health checks | Route Handlers for app liveness and database connectivity | Simple deploy and monitoring target. | External synthetic only. | Must not disclose sensitive environment details. |
| Backup/recovery | Managed PostgreSQL automated backups plus documented restore drill before pilot production | Meets founder backup/recovery requirement. | Manual exports only. | RPO/RTO and provider-specific restore steps remain approval items. |

## Request Lifecycle

1. User request enters Operational vNext.
2. Framework session/auth integration resolves identity.
3. Application context resolves organization, office scope, memberships, roles, and request id.
4. Route Handler, Server Component, or Server Action calls a policy function for the requested capability.
5. Data-access layer applies organization and office scope to every tenant-owned query.
6. Service layer coordinates transactions and calls deterministic domain engine where needed.
7. Domain engine returns explicit results.
8. Service layer persists current state, snapshots, decisions, audit events, and data-quality findings.
9. UI receives view models, not raw database rows.

## Major Module Boundaries

- `identity-access`: session context, memberships, roles, permissions.
- `organizations-offices`: organization and office configuration.
- `people-readiness`: technicians, availability, certifications, clearances.
- `equipment-readiness`: equipment, availability, calibrations.
- `work-orders`: projects, job sites, work orders, assignments, service requirements.
- `imports`: file validation, preview, confirmation, import execution, row outcomes.
- `readiness-engine`: pure domain rule evaluation.
- `coverage-decisions`: candidate eligibility, proposals, approvals, cascading impact.
- `decision-log-audit`: business decisions and system audit events.
- `data-quality`: import and operational data issues.
- `operational-impact`: issue caught and time-saved measurement.

## Domain-Engine Boundary

The readiness engine must live in pure TypeScript modules with no imports from Next.js, React, database clients, auth providers, environment variables, or network services.

Inputs:

- Explicit work order facts.
- Technician facts.
- Equipment facts.
- Service requirements.
- Assignment context.
- Rule version.
- Snapshot context.

Outputs:

- Work order evaluated.
- Rule identifier.
- Input facts used.
- Pass/fail result.
- Severity.
- Explanation.
- Suggested remediation where available.
- Final status.
- Evaluation timestamp or snapshot context.

## Persistence Boundary

Database rows are persistence models. They are not the complete domain model.

Use repositories or query modules to map between:

- Database persistence models.
- Domain input facts.
- API/action input schemas.
- UI view models.

## Authentication Boundary

Managed identity should authenticate the human user. CMTCommand should own:

- Organization membership.
- Office scope.
- Role assignment.
- Permission policy.
- Audit events.

## Import-Processing Boundary

Import processing belongs to an import module, not UI components or route handlers. Route Handlers should validate request shape, authorize the actor, and call import services. The import module should own file parsing, preview records, row outcomes, confirmation, execution, retry status, and data-quality issue creation.

## Deployment Model

Target deployment is one primary managed Next.js application plus managed PostgreSQL. The operational app must support separate development, staging, and pilot-production environments, HTTPS, secrets, deployment history, rollback, health checks, logs, monitoring, backups, and recovery procedure.

Phase 5H approves managed-provider categories for the production-readiness
direction but does not approve specific vendors. Exact provider selection
remains a Phase 5I checkpoint before real deployment configuration.

## Testing Implications

- Domain unit tests run without browser, server, database, auth provider, or network.
- Integration tests cover persistence, transactions, imports, snapshots, decisions, and audit history.
- Authorization tests cover allowed and denied cases for every role.
- Browser/E2E tests cover readiness board, action queue, imports, coverage workflow, approvals, failure states, and decision history.
- Existing root static verifier remains separate and required for the demo.

## Security Implications

- Authorization must be rechecked server-side at mutation and data-read boundaries.
- Middleware or proxy may help routing but must not be the only authorization boundary.
- All tenant-owned tables require organization scope and relevant office scope.
- Logs must never include full imported rows, forbidden sensitive fields, secrets, or raw files.
- Decision Log and audit history must be append-only except for explicit superseding entries.

## Rejected Alternatives

- Microservices: too much operational burden for one-office pilot.
- Kubernetes: unnecessary for one primary app and managed database.
- Event-streaming infrastructure: no current evidence of throughput or integration complexity requiring it.
- Separate frontend/backend as default: more deployment and debugging burden than the pilot needs.
- Static demo plus backend attachment: risks converting demo-only behavior into production behavior and weakens server-side authorization.
- Document database primary store: relational data and audit history fit PostgreSQL better.

## Reversal Strategy

If the selected architecture proves unsuitable before scaffolding, supersede this ADR with a new architecture ADR and leave the static demo unchanged. If it proves unsuitable after scaffolding, keep the app boundary isolated under the selected repository location so the operational directory can be replaced without moving the root demo.

## Conditions Requiring Reconsideration

- Pilot requirements change to real-time multi-office dispatch with high concurrency.
- Customer mandates an identity, database, or hosting platform incompatible with the selected path.
- Import volumes exceed the platform request/job model and require durable external queueing.
- A compliance or procurement requirement disallows the selected managed provider category.
- Next.js, selected auth integration, or selected database tooling has a blocking security or maintenance issue at implementation time.

## Open Questions

- [OPEN QUESTION - High Impact] Which exact managed identity provider should be selected before auth scaffolding?
- [OPEN QUESTION - High Impact] Which exact managed PostgreSQL provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - High Impact] Which exact managed Next.js hosting provider should be selected before pilot deployment configuration?
- [OPEN QUESTION - Medium Impact] Which CSV/XLSX parsing packages should pass dependency, license, and security review during scaffolding?
