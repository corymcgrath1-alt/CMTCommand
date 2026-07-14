# Deployment And Operations

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `README.md`
  - `AGENTS.md`
  - `.github/workflows/root-static-checks.yml`
  - `.github/workflows/operational-ci.yml`
  - `scripts/verify-root.mjs`
  - `apps/operational/package.json`
  - `apps/operational/.env.example`
  - `apps/operational/src/app/api/health/route.ts`
  - `apps/operational/src/app/api/ready/route.ts`
  - `apps/operational/drizzle/0000_open_giant_girl.sql`
  - `apps/operational/scripts/db-migrate-test.ts`
  - `apps/operational/src/server/db/test-safety.ts`
  - `.gitignore`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-14

## Current Demo - Confirmed

Local development:

```powershell
python -m http.server 8765
```

Open:

```text
http://127.0.0.1:8765/
```

If default Python is unavailable, README documents a bundled Codex Python runtime path.

Build process:

- No root build process found.

Deployment platform:

- No root deployment platform/config found.

CI/CD:

- GitHub Actions workflow `root-static-checks.yml` runs root static checks.
- No deployment workflow found.

Environment variables:

- No root `.env.example` or environment-variable contract found.

Database migration process:

- No root database/migration process found.

Scheduled jobs:

- No root scheduled jobs found.

Logging/monitoring/error reporting:

- No production logging, monitoring, or error-reporting configuration found.
- Local server logs are ignored artifacts.

Backups/rollback/health checks:

- No repository evidence found for production backup, rollback, or health-check procedures.

## Founder Decision - 2026-07-13

Pilot V1 requires a managed cloud deployment with:

- Separate development environment.
- Separate staging environment.
- Separate pilot-production environment.
- HTTPS.
- Protected environment secrets.
- Managed persistent database.
- Automated database backups.
- Reproducible deployments.
- Deployment history.
- Application rollback capability.
- Documented database-recovery procedure.
- Application health check.
- Database connectivity health check.
- Structured application error logging.
- Import-failure logging.
- Basic operational monitoring.

The provider and implementation stack remain unresolved until the guarded architecture phase.

## Architecture Selection - 2026-07-13

Operational vNext should target a managed Next.js-capable deployment platform plus managed PostgreSQL. Vercel plus a managed PostgreSQL provider is the leading provider path because it aligns with the selected Next.js architecture and low-operations pilot requirement, but exact provider selection remains a checkpoint before real deployment configuration.

No deployment configuration is implemented yet.

## Operational vNext Scaffold - Confirmed

Phase 4 added a local operational shell and scoped CI proof:

- `apps/operational/.env.example` defines blank placeholders for `APP_ENV`, `DATABASE_URL`, and `TEST_DATABASE_URL`.
- `GET /api/health` returns app liveness without PostgreSQL.
- `GET /api/ready` returns database readiness and 503 when PostgreSQL is unconfigured or unreachable.
- `.github/workflows/operational-ci.yml` runs `npm ci`, `npm run verify`, and the root static verifier without secrets, database, auth provider, browser gate, or deployment.

This is not a managed deployment configuration.

## Phase 5 Database Operations - Confirmed

Phase 5 adds the first database migration and a test-only database verification
path:

- `apps/operational/drizzle/0000_open_giant_girl.sql` creates only
  `organizations`, `offices`, their status enums, and required constraints.
- `npm run db:migrate` uses normal `DATABASE_URL` through Drizzle Kit.
- `npm run db:migrate:test` requires `APP_ENV=test` and `TEST_DATABASE_URL`.
- `npm run verify:db` runs test migration application and PostgreSQL integration
  tests.
- Test database safety logic rejects blank test URLs, non-test database names,
  and unsafe-looking production/staging/pilot names, and redacts credentials in
  output.

The operational CI workflow now has a separate PostgreSQL service-container job
for the database gate. It uses Node `22.22.2` and requires no external secrets or
managed provider account.

This is still not a production database provider, backup, recovery, monitoring,
or deployment configuration.

## Pilot V1 Operational Gaps

- No exact selected hosting provider.
- No exact selected database provider.
- No selected auth provider.
- No deployment pipeline.
- No production environment-variable contract beyond the Phase 4 scaffold placeholders.
- No production database backup/recovery procedure.
- No deployed health-check monitor or provider-level health integration.
- No structured logging or monitoring configuration.

## Artifact Policy

Do not commit generated/local artifacts unless explicitly scoped:

- ZIP release exports.
- Screenshots.
- Workbooks.
- Server logs.
- `.pnpm-store/`.
- `_migration_review/`.
- Browser validation JSON/PNG outputs.

## Open Questions

- [OPEN QUESTION - High Impact] Which exact managed Next.js hosting provider should satisfy Pilot V1 deployment and rollback requirements?
- [OPEN QUESTION - High Impact] Which exact managed PostgreSQL provider should satisfy Pilot V1 backup and recovery requirements?
- [OPEN QUESTION - High Impact] What database recovery time and recovery point expectations apply to the pilot?
- [OPEN QUESTION - Medium Impact] What structured log fields are safe and necessary for import failures and readiness decisions?
- [OPEN QUESTION - Medium Impact] What provider-level monitor, alert, and dashboard should consume the scaffold health responses?
