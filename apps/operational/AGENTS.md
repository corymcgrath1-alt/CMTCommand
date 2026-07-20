# Operational vNext Agent Guide

This guide supplements the root [CMTCommand Agent Guide](../../AGENTS.md). It applies only inside `apps/operational/`.

## Required Reading

- Root instructions: [../../AGENTS.md](../../AGENTS.md)
- Bible index: [../../docs/CMTCOMMAND_BIBLE/00_INDEX.md](../../docs/CMTCOMMAND_BIBLE/00_INDEX.md)
- Architecture: [../../docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md](../../docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md)
- Data and integrations: [../../docs/CMTCOMMAND_BIBLE/05_DATA_MODEL_AND_INTEGRATIONS.md](../../docs/CMTCOMMAND_BIBLE/05_DATA_MODEL_AND_INTEGRATIONS.md)
- Engineering standards: [../../docs/CMTCOMMAND_BIBLE/06_ENGINEERING_STANDARDS.md](../../docs/CMTCOMMAND_BIBLE/06_ENGINEERING_STANDARDS.md)
- Security and permissions: [../../docs/CMTCOMMAND_BIBLE/09_SECURITY_PRIVACY_AND_PERMISSIONS.md](../../docs/CMTCOMMAND_BIBLE/09_SECURITY_PRIVACY_AND_PERMISSIONS.md)
- Testing: [../../docs/CMTCOMMAND_BIBLE/10_TESTING_AND_ACCEPTANCE.md](../../docs/CMTCOMMAND_BIBLE/10_TESTING_AND_ACCEPTANCE.md)
- Deployment and operations: [../../docs/CMTCOMMAND_BIBLE/11_DEPLOYMENT_AND_OPERATIONS.md](../../docs/CMTCOMMAND_BIBLE/11_DEPLOYMENT_AND_OPERATIONS.md)
- Operational blueprint: [../../docs/CMTCOMMAND_BIBLE/plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md](../../docs/CMTCOMMAND_BIBLE/plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md)

## Scope

- This app is the Operational vNext scaffold, not the Pilot V1 product.
- Do not introduce domain entities until the applicable schema phase.
- Do not copy the root static demo or make it depend on this app.
- Do not add auth, tenancy, imports, readiness, coverage, Decision Log, audit, or deployment behavior unless the current task explicitly scopes it.

## Architecture Rules

- Use Server Components unless browser interactivity is required.
- Keep secrets and database access in server-side modules.
- Keep Route Handlers thin; delegate to services.
- Keep persistence models separate from domain behavior.
- Do not embed readiness rules in React components, Route Handlers, ORM hooks, or database queries.
- Every future tenant-owned query must be scoped to organization and, where applicable, office.
- Never enforce authorization only in the UI.
- Do not rely on middleware or proxy as the only authorization boundary.

## Dependencies

- Use npm inside this directory only.
- Do not add dependencies without documenting the need in the relevant docs.
- Do not add Tailwind, component libraries, auth providers, CSV/XLSX parsers, logging SaaS SDKs, deployment SDKs, or queue packages unless a later phase approves them.
- Lockfile changes must correspond to dependency changes in this app.

## Verification

Run from `apps/operational/`:

```powershell
npm run verify
```

Run browser smoke tests separately when the environment supports them:

```powershell
npm run test:e2e
```

Run database smoke tests only with an explicit safe test database:

```powershell
npm run test:db
```

After operational changes, also run the root static-demo verifier from the repository root:

```powershell
node scripts\verify-root.mjs
```
