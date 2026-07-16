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
  - `apps/operational/drizzle/0001_office-composite-key.sql`
  - `apps/operational/drizzle/0002_identity-membership-rbac.sql`
  - `apps/operational/drizzle/0003_vengeful_vapor.sql`
  - `apps/operational/drizzle/0004_right_reavers.sql`
  - `apps/operational/drizzle/0005_chemical_eternity.sql`
  - `apps/operational/drizzle/0006_dispatch-backfill-and-history-guards.sql`
  - `apps/operational/drizzle/0007_deep_smasher.sql`
  - `apps/operational/scripts/db-migrate-test.ts`
  - `apps/operational/src/server/db/test-safety.ts`
  - `.gitignore`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-16

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

- `apps/operational/.env.example` defines blank placeholders for `APP_ENV`,
  database URLs, exact test-database identity proofs, and destructive-cleanup
  authorization, plus fail-closed auth mode, session secret, and development
  subject allowlist settings.
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
- `npm run db:migrate:test` requires `APP_ENV=test`, `TEST_DATABASE_URL`, the
  exact repository test-database name, and an explicitly declared loopback host.
- `npm run verify:db` runs test migration application and PostgreSQL integration
  tests.
- PostgreSQL integration cleanup additionally requires an exact destructive-reset
  authorization value and verifies the live `current_database()` result inside
  the cleanup transaction before destructive SQL executes.
- Test database safety logic rejects blank or ambiguous proofs, substring-only
  test names, arbitrary remote hosts, URL/identity disagreement, and
  production-like identities. Diagnostics redact credentials.
- Cleanup enumerates current assignment events/relationships, dispatch
  assignments, work orders, technician eligibility, technicians, service types,
  projects, identity, office, and organization tables in dependency-first order
  with `RESTRICT`; future dependent tables fail cleanup visibly instead of being
  silently removed through `CASCADE`.

The operational CI workflow now has a separate PostgreSQL service-container job
for the database gate. It uses Node `22.22.2` and requires no external secrets or
managed provider account.

This is still not a production database provider, backup, recovery, monitoring,
or deployment configuration.

## Phase 5F Audit Operations - Confirmed

Migrations `0008` and `0009` add the audit schema and PostgreSQL append-only
trigger. Apply them with the existing Drizzle migration command; do not run
audit DDL from application startup and do not seed audit rows from migrations.

The current local/test database user can create schema objects and execute the
integration cleanup. Production roles are not defined yet. Before pilot
deployment, define separate migration/application responsibilities and verify
that the application role has only required insert and authorized select access,
without ordinary audit update/delete privileges. The trigger remains defense in
depth, not a substitute for least-privilege grants.

No final retention duration is approved. Backups must retain audit/source
transaction consistency. Legal hold, archive tiers, controlled purge, privacy
request handling, audit-read monitoring, and external observability/SIEM export
need approved runbooks before production use. Test cleanup remains limited to
the exact loopback database guard and explicitly lists `audit_events` first.

## Phase 5D Authentication Operations - Confirmed

No production identity provider is selected. Operational vNext defaults to
`AUTH_MODE=disabled`; protected access therefore fails closed in production.

Local development/test identity requires all of:

```text
APP_ENV=development or test
AUTH_MODE=development
AUTH_SESSION_SECRET=<minimum 32 local-only characters>
AUTH_DEVELOPMENT_SUBJECTS=<explicit comma-separated allowlist>
DATABASE_URL=<migrated local PostgreSQL database>
```

The development adapter is rejected when `APP_ENV` is staging,
pilot-production, or production, and also when `NODE_ENV=production`. Never put
real provider secrets in these variables or commit `.env`/`.env.local`.

Local identity setup:

```powershell
npm run db:migrate
npm run seed:identity:dev
npm run dev
```

The seed command is non-production gated and separate from migrations. It creates
deterministic Alpha/Beta fixtures for authorization acceptance testing only.

Production deployment remains blocked until a managed provider is selected and
its issuer/audience/signature/expiration/state verification, secure session
cookie behavior, invitation path, secret rotation, and incident/revocation
operations are documented and tested.

See `apps/operational/README.md` for subject fixtures, controlled failure states,
and manual authorized-request verification.

## Pilot V1 Operational Gaps

- No exact selected hosting provider.
- No exact selected database provider.
- No selected auth provider.
- No deployment pipeline.
- No production auth-provider environment contract beyond the fail-closed
  `AUTH_MODE=disabled` boundary.
- No production database backup/recovery procedure.
- No deployed health-check monitor or provider-level health integration.
- No structured logging or monitoring configuration.
- No approved audit retention/archive/legal-hold/purge runbook or production
  database-role grant model.

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
