# Phase 4 Scaffolding Report

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `apps/operational/`
  - `apps/operational/package.json`
  - `apps/operational/package-lock.json`
  - `apps/operational/src/app/api/health/route.ts`
  - `apps/operational/src/app/api/ready/route.ts`
  - `apps/operational/src/server/db/`
  - `apps/operational/src/server/health/service.ts`
  - `apps/operational/tests/`
  - `.github/workflows/operational-ci.yml`
  - `scripts/verify-root.mjs`
- Last Reviewed: 2026-07-13

## Summary

Phase 4 created a bounded Operational vNext scaffold at `apps/operational/`.
The root static demo remains in place and independently verified.

The scaffold proves the selected technical shell only. It does not implement
authentication, tenancy, imports, domain schemas, readiness rules, coverage,
Decision Log behavior, audit events, operational impact, or deployment.

## Commit Baseline Inspected

- Baseline commit: `0963fb1 Select CMTCommand operational vNext architecture`.
- Phase 3 documentation was committed before scaffolding began.
- Pre-existing unrelated dirty files were present under `euchre-platform/` and
  were not modified.

## Files Created

Operational app:

- `apps/operational/AGENTS.md`
- `apps/operational/README.md`
- `apps/operational/package.json`
- `apps/operational/package-lock.json`
- `apps/operational/.nvmrc`
- `apps/operational/.env.example`
- `apps/operational/.gitignore`
- `apps/operational/tsconfig.json`
- `apps/operational/next.config.ts`
- `apps/operational/eslint.config.mjs`
- `apps/operational/vitest.config.ts`
- `apps/operational/playwright.config.ts`
- `apps/operational/drizzle.config.ts`
- `apps/operational/src/`
- `apps/operational/scripts/db-smoke.ts`
- `apps/operational/tests/`

CI:

- `.github/workflows/operational-ci.yml`

## Dependencies Selected

| Category | Package | Version | Notes |
| --- | --- | ---: | --- |
| Framework | `next` | `16.2.10` | Stable App Router release; package requires Node `>=20.9.0`. |
| UI runtime | `react`, `react-dom` | `19.2.7` | Direct peer dependency of Next. |
| Language | `typescript` | `6.0.3` | Latest stable line compatible with the Next ESLint toolchain peer range. |
| Database ORM | `drizzle-orm` | `0.45.2` | Selected in ADR-002. |
| Migration tool | `drizzle-kit` | `0.31.10` | Configured, but no domain schema or migration is created in Phase 4. |
| PostgreSQL driver | `pg` | `8.22.0` | Least provider-specific Node PostgreSQL driver for Drizzle. |
| Validation | `zod` | `4.4.3` | Server environment validation only in Phase 4. |
| Unit tests | `vitest` | `4.1.10` | Unit tests do not require PostgreSQL. |
| Browser tests | `@playwright/test` | `1.61.1` | Separate non-blocking browser smoke command. |
| Linting | `eslint` | `9.39.5` | Latest stable compatible line for Next config dependencies. |
| Next lint config | `eslint-config-next` | `16.2.10` | Uses flat config exports. |
| Script runtime | `tsx` | `4.23.1` | Used only for the explicit database smoke test. |

## Node And npm

- Declared target Node LTS: `22.22.2` in `apps/operational/.nvmrc`.
- `package.json` engine: Node `>=22.22.2`.
- Local verification Node: `v24.16.0`.
- Local npm: `12.0.1`.

## PostgreSQL Driver Selection

`pg` was selected because it is provider-neutral, works with the Node.js
runtime, and is supported by Drizzle's `node-postgres` adapter. This avoids
binding the scaffold to a specific managed PostgreSQL vendor before the provider
checkpoint.

Tradeoff: future serverless hosting may require pool sizing, connection reuse,
or a provider-specific adapter decision before pilot production.

## Repository Boundary Confirmation

- Operational vNext lives only under `apps/operational/`.
- No root `package.json`, root workspace, root lockfile, or root framework files
  were created.
- Root `index.html`, `app.js`, `styles.css`, root utilities, root tests, and
  root verification scripts were not changed.
- Operational CI is path-scoped to `apps/operational/**` and its own workflow.

## Health-Check Behavior

`GET /api/health`:

- Uses the Node.js runtime.
- Does not require PostgreSQL.
- Returns HTTP 200 with stable JSON:
  `{"status":"ok","service":"cmtcommand-operational"}`.
- Sends `Cache-Control: no-store`.

`GET /api/ready`:

- Uses the Node.js runtime.
- Checks PostgreSQL only when invoked.
- Returns HTTP 200 only when PostgreSQL connectivity succeeds.
- Returns HTTP 503 when PostgreSQL is not configured or unavailable.
- Uses stable reason codes: `database_not_configured`,
  `database_unavailable`.
- Does not return connection strings, hostnames, stack traces, or raw driver
  errors.

## Test Architecture Established

- Unit tests cover environment validation, liveness, readiness status mapping,
  database-not-configured mapping, database-unavailable mapping, and public
  sanitization behavior.
- Playwright covers the scaffold page, `/api/health`, and `/api/ready` without
  a configured database.
- Database smoke testing is explicit and separate through `npm run test:db`.
- The default gate does not require PostgreSQL, browser installation, auth
  credentials, deployment accounts, or customer data.

## Commands Added

From `apps/operational/`:

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:db
npm run test:e2e
npm run verify
npm run verify:full
npm run db:generate
npm run db:migrate
npm run db:studio
```

`npm run verify` runs lint, typecheck, unit tests, and production build.

## Verification Completed

- `node scripts\verify-root.mjs` before scaffolding: passed.
- `npm ci`: passed from `apps/operational/package-lock.json`.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 3 files and 11 tests.
- `npm run build`: passed without PostgreSQL.
- `npm run verify`: passed after clean install.
- `npm run test:e2e`: passed, 3 Playwright tests.
- `npm audit --omit=dev --json`: completed with 2 moderate production findings.
- `npm audit --json`: completed with 6 moderate total findings.
- `npm install-scripts ls`: reported blocked install scripts, but lint,
  typecheck, unit tests, build, and browser smoke still passed.

## Verification Not Completed

- `npm run test:db` was not run because no safe `TEST_DATABASE_URL` was
  available in this environment.
- Drizzle migration execution was not run because no Pilot V1 domain schema or
  safe database exists in Phase 4.
- Deployment, rollback, backup, and monitoring verification were not run because
  provider selection remains deferred.

## Dependency Audit Findings

Production audit:

- 2 moderate findings through `next` and transitive `postcss`.
- npm suggested a major downgrade path, so no automatic audit fix was applied.

Full audit:

- 6 moderate findings total.
- Additional development findings pass through `drizzle-kit` and transitive
  `esbuild` packages.
- No high or critical findings were reported.

## Security Observations

- `.env.example` contains blank placeholders only.
- No `.env` or real credentials were created.
- Database URLs are not returned by health endpoints.
- Readiness failures return stable reason codes, not raw driver errors.
- The database pool is lazy and not opened during module import or production
  build.
- `npm install-scripts ls` reported blocked install scripts for `esbuild`,
  `sharp`, and `unrs-resolver`; the scaffold still verified successfully, so no
  install script approvals were added in this phase.

## Known Limitations

- The Drizzle schema path exists but exports no Pilot V1 domain tables.
- Drizzle commands are configured but migrations are not proven.
- `GET /api/ready` cannot prove real PostgreSQL connectivity until a safe test
  database is provided.
- The page is a technical scaffold page, not the Pilot V1 operational UI.
- No authentication, authorization, organization/office scoping, audit, imports,
  readiness logic, coverage logic, or deployment exists.

## Decisions Intentionally Deferred

- Managed authentication provider.
- Managed PostgreSQL provider.
- Managed Next.js hosting provider.
- Tenant schema and RLS timing.
- Pilot data retention/deletion periods.
- Import parser packages.
- Domain schema and migrations.
- Readiness thresholds, coverage ranking, and operational-impact formulas.
- Deployment secrets, monitoring, backup, and rollback procedures.

## Recommendation For Next Phase

The next guarded implementation phase should implement only the organization
and office tenancy foundation: schema, migrations, scoped data-access helpers,
and isolation tests. Do not add technicians, work orders, imports, readiness
rules, or coverage workflow until the tenancy boundary is persisted and tested.
