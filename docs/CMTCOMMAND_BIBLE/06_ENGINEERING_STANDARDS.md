# Engineering Standards

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `AGENTS.md`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `index.html`
  - `app.js`
  - `scripts/verify-root.mjs`
  - `.github/workflows/root-static-checks.yml`
  - `apps/operational/package.json`
  - `apps/operational/package-lock.json`
  - `apps/operational/README.md`
  - `.github/workflows/operational-ci.yml`
  - `apps/operational/src/server/db/schema/`
  - `apps/operational/src/server/tenancy/`
  - `apps/operational/drizzle/0000_open_giant_girl.sql`
- `tests/`
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-14

## Confirmed

Languages:

- HTML.
- CSS.
- JavaScript.
- Node.js for tests/scripts.

Framework/package manager:

- No root frontend framework found.
- No root package manager or `package.json` found.

Repository structure:

- Root static app files at repository root.
- Utility modules at repository root.
- Tests under `tests/`.
- CI under `.github/workflows/`.
- Durable docs under `docs/`.

Module conventions:

- Utility modules use dependency-free UMD wrappers with browser globals and CommonJS exports.
- `app.js` uses global utility objects and delegated event listeners.
- `scripts/verify-root.mjs` runs syntax checks, deterministic Node tests, and trailing-whitespace checks for selected root files.

State-management conventions:

- Central in-memory `state` object in `app.js`.
- Safe localStorage helper usage through `demoShared.js`.
- Known demo reset keys only.

Testing conventions:

- Dependency-free Node tests using `assert`.
- Test files are run directly by Node.
- No root Jest/Vitest/Playwright package configuration found.

## Exact Commands

Run app:

```powershell
python -m http.server 8765
```

Root verification:

```powershell
node scripts\verify-root.mjs
```

Whitespace/diff check:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md .github docs/CMTCOMMAND_BIBLE
```

No root commands found for dependency installation, linting, type checking, formatting, building, or database migration/generation.

Operational vNext commands from `apps/operational/package.json`:

```powershell
cd apps\operational
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
npm run test:e2e
npm run test:db
npm run test:integration
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run verify:db
npm run verify:full
npm run db:studio
```

`npm run verify` is the stable operational gate and runs lint, typecheck, unit
tests, and production build. It must not require a live database, browser
installation, auth provider credentials, deployment account, or customer data.
`npm run verify:db` applies test migrations and runs PostgreSQL integration
tests with explicit `APP_ENV=test`, `TEST_DATABASE_URL`, the exact repository
test-database name and loopback host, and destructive-cleanup authorization.
`npm run verify:full` preserves the Phase 4 browser behavior: stable
verification plus Playwright scaffold smoke tests. `npm run test:e2e`,
`npm run test:db`, and `npm run test:integration` remain explicit separate
checks.

## Dependency Policy

Current enforced-by-convention policy:

- Do not add production dependencies without strong evidence and explicit scope.
- Prefer standard library and existing utilities.
- Do not add a package manager just to wrap existing Node checks.

Pilot V1 operational dependencies must be selected during the guarded architecture phase described in [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md) and the [implementation sequence](plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md).

## Operational vNext Target Standards

Phase 3 selected these target standards for the operational app. Phase 4
implemented the app shell and toolchain, but not Pilot V1 business behavior:

- TypeScript end to end.
- Next.js App Router on Node.js runtime.
- App-local package boundary under `apps/operational/`.
- PostgreSQL with Drizzle ORM and Drizzle Kit migrations.
- Zod validation at API/action/import boundaries.
- Zod validation for current organization, office, and access-scope inputs.
- Pure TypeScript readiness engine with no framework/database/auth imports.
- Vitest for domain and integration tests.
- Playwright for operational UI/E2E tests.

These are operational app commands and files only; they are not root static-demo
commands.

## Generated-File Policy

Generated/local artifacts should stay out of root source scope:

- ZIP exports.
- Screenshots.
- Workbooks.
- Server logs.
- `.pnpm-store/`.
- `_migration_review/`.
- Browser validation JSON/PNG outputs.

## Review Expectations

- Preserve unrelated user changes.
- Use explicit file lists for staging if staging is requested.
- Do not broaden scope into `euchre-platform/` or `brackethub/`.
- Add/update tests when deterministic behavior changes.
- Browser-smoke UI/state changes.
- For Pilot V1 planning, do not describe target-state decisions as implemented behavior.

## Inferred

The current engineering system is optimized for deterministic static-app checks rather than a full build/lint/type pipeline.

## Proposed Standards Requiring Approval

- Whether to modularize `app.js`.
- Whether the current demo should ever adopt a package system.
- Whether browser/CDP validation should become CI after the founder-approved stability threshold is met.

## Open Questions

- [OPEN QUESTION - High Impact] Should root CMTCommand adopt a package manager before further current-demo feature work?
- [OPEN QUESTION - Medium Impact] What file-size or complexity threshold should trigger extracting page modules from `app.js`?
- [OPEN QUESTION - Medium Impact] Should markdown documentation checks be added, or is manual/link validation sufficient?
