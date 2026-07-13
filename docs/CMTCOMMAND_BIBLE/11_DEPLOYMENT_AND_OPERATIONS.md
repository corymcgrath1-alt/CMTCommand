# Deployment And Operations

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `README.md`
  - `AGENTS.md`
  - `.github/workflows/root-static-checks.yml`
  - `scripts/verify-root.mjs`
  - `.gitignore`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

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

## Pilot V1 Operational Gaps

- No exact selected hosting provider.
- No exact selected database provider.
- No selected auth provider.
- No deployment pipeline.
- No environment-variable contract.
- No database backup/recovery procedure.
- No app/database health endpoint.
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
- [OPEN QUESTION - Medium Impact] What health-check response should represent application and database readiness?
