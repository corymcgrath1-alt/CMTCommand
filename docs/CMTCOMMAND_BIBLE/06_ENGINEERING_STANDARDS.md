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
  - `tests/`
- Last Reviewed: 2026-07-13

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

## Dependency Policy

Current enforced-by-convention policy:

- Do not add production dependencies without strong evidence and explicit scope.
- Prefer standard library and existing utilities.
- Do not add a package manager just to wrap existing Node checks.

Pilot V1 operational dependencies must be selected during the guarded architecture phase described in [ADR-001](decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md) and the [implementation sequence](plans/PILOT_V1_IMPLEMENTATION_SEQUENCE.md).

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
