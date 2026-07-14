# CMTCommand Operational vNext

This directory contains the guarded Operational vNext scaffold for CMTCommand.
It proves the app boundary, TypeScript/Next.js toolchain, health endpoints,
environment validation, Drizzle/PostgreSQL wiring, unit testing, and browser
test configuration.

It does not implement Pilot V1 business functionality.

## Current Scope

Implemented in this scaffold:

- Next.js App Router shell.
- Server-side environment validation with Zod.
- Lazy PostgreSQL/Drizzle connection wiring.
- `/api/health` liveness endpoint.
- `/api/ready` database-readiness endpoint.
- Vitest unit tests.
- Playwright browser smoke test configuration.
- App-local npm package and lockfile.

Not implemented:

- Authentication, invitations, users, roles, or authorization.
- Organizations, offices, tenant scoping, or customer schemas.
- Imports, work orders, technicians, equipment, readiness rules, coverage, Decision Log, audit events, operational impact, or deployment.

## Runtime

- Node target: 22.22.2 or newer, declared in `.nvmrc` and `package.json`.
- npm: declared through `packageManager`.

The local verification environment may use a newer compatible Node version, but
CI targets Node 22.22.2.

## Setup

From this directory:

```powershell
npm ci
```

Create local environment files only when needed. Do not commit `.env` or
`.env.local`.

```text
APP_ENV=development
DATABASE_URL=
TEST_DATABASE_URL=
```

Leaving database values blank is valid for linting, type checking, unit tests,
the scaffold home page, and production build.

## Development

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/` unless Next.js selects another port.

## Health Checks

`GET /api/health`

- Does not require PostgreSQL.
- Returns HTTP 200 with `{ "status": "ok", "service": "cmtcommand-operational" }`.

`GET /api/ready`

- Checks PostgreSQL connectivity with a minimal query.
- Returns HTTP 200 only when PostgreSQL is configured and reachable.
- Returns HTTP 503 with a stable reason such as `database_not_configured` or `database_unavailable`.
- Does not return database URLs, hostnames, stack traces, or raw driver errors.

## Commands

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

`npm run verify` is the stable default gate: lint, typecheck, unit tests, and
production build. It does not require a live database, browser installation, or
auth provider credentials.

`npm run test:db` requires a safe `TEST_DATABASE_URL`. It is intentionally not
part of the default gate.

`npm run test:e2e` runs Playwright browser smoke tests and is intentionally not
part of the default gate.

## Relationship To The Static Demo

The root static demo remains the trusted product reference and is independently
runnable. Operational vNext must not import root demo runtime code or require
root package tooling.

After changes here, run the root verifier from the repository root:

```powershell
node scripts\verify-root.mjs
```

## Documentation

Start with the CMTCommand Bible:

- [Bible index](../../docs/CMTCOMMAND_BIBLE/00_INDEX.md)
- [Operational architecture blueprint](../../docs/CMTCOMMAND_BIBLE/plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md)
- [Phase 4 scaffolding report](../../docs/CMTCOMMAND_BIBLE/plans/PHASE_4_SCAFFOLDING_REPORT.md)

This scaffold is not ready for pilot use until later guarded phases add the
data foundation, imports, readiness engine, coverage workflow, security model,
and pilot operations.
