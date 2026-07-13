# ADR-003 Operational vNext Repository Boundary

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
  - `AGENTS.md`
  - `README.md`
  - `MIGRATION_CLEANUP_REPORT.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-001_PRESERVE_STATIC_DEMO_AND_BUILD_OPERATIONAL_VNEXT.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md`
- Last Reviewed: 2026-07-13

## Current Repository State

Root CMTCommand is a static demo served from the repository root. It has no root package manifest, dependency lockfile, build command, database schema, auth config, deployment config, or migration system.

The repository also contains unrelated or out-of-root-scope directories such as `euchre-platform/` and `brackethub/`. Current working tree status shows active unrelated `euchre-platform/` changes. Operational vNext must not be placed inside or coupled to those directories.

## Decision

Operational vNext should live in a future top-level directory:

```text
apps/operational/
```

Do not create that directory during this documentation phase.

The root static demo remains at repository root and remains independently runnable with:

```powershell
python -m http.server 8765
node scripts\verify-root.mjs
```

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| `operational-vnext/` at repository root | Simple name, obvious separation. | Less extensible if future packages/apps appear; weaker conventional app grouping. | Rejected. |
| `apps/operational/` without moving existing demo | Clear app boundary, future-friendly if shared packages or additional apps appear, avoids moving root demo. | Slightly more structure than a single top-level folder; future root workspace must be introduced carefully. | Selected. |
| Separate repository | Strongest isolation and independent history. | Splits Bible/docs from implementation, makes founder navigation harder, complicates demo/reference comparisons. | Rejected for Pilot V1. |
| Existing `brackethub/` or `euchre-platform/` structure | Existing app folders already exist. | They are unrelated projects and out of root CMTCommand scope. | Rejected. |

## Static Demo Preservation

- Do not move `index.html`, `app.js`, `styles.css`, root utilities, root `tests/`, or `scripts/verify-root.mjs`.
- Do not convert the root demo into a framework app.
- Do not make root demo runtime depend on `apps/operational/`.
- Keep root static verification separate from operational app verification.
- Any future shared fixtures must be additive and must not require the static demo to install operational dependencies.

## Dependency Boundaries

Initial scaffolding should use an app-local package manifest inside `apps/operational/`. A root workspace may be introduced later only if a shared package need is proven.

Do not add a root package manifest solely to manage the operational app if app-local commands are sufficient.

## Build Boundaries

- Root demo: no build, static server, `node scripts\verify-root.mjs`.
- Operational vNext: future app-local TypeScript/Next.js build and tests under `apps/operational/`.
- No operational build step should be required to run or verify the root demo.

## Test Boundaries

- Root static checks remain in `.github/workflows/root-static-checks.yml`.
- Operational checks should be added in a separate workflow or workflow job scoped to `apps/operational/**` when scaffolding exists.
- Cross-boundary acceptance should compare behavior against the static demo's TRD-104 reference, but not import root static runtime files into operational product code by default.

## Documentation Ownership

- `docs/CMTCOMMAND_BIBLE/` remains the canonical project documentation.
- Operational app-specific README and runbooks may live under `apps/operational/` after scaffolding.
- ADRs remain in `docs/CMTCOMMAND_BIBLE/decisions/`.

## CI Implications

Future CI should keep two visible lanes:

- Root static demo lane: current verifier.
- Operational vNext lane: app-local install, typecheck, lint, unit tests, integration tests, build, and selected E2E tests.

The lanes can run independently so an operational dependency change does not block unrelated static-demo documentation unless relevant files overlap.

## Shared Fixtures Or Shared Packages

Do not create shared packages during scaffolding unless there is a concrete use.

Acceptable future shared artifacts:

- TRD-104-equivalent fixture data expressed as JSON/TS test fixture.
- Readiness rule examples.
- Visual comparison screenshots or notes.

Avoid sharing:

- Root `app.js` runtime code.
- Demo localStorage state.
- Demo-only UI role selector behavior.

## Migration Path

1. Keep root demo unchanged.
2. Scaffold `apps/operational/` in the next guarded phase.
3. Prove local dev, database test, typecheck, unit test, build, and health route without business features.
4. Add domain modules and persistence in later phases.
5. Use static demo only as reference for TRD-104 story and visual behavior.
6. Decide later whether any shared fixtures or domain packages are justified.

## Risk Of Visual Or Behavioral Drift

Risk: Operational vNext may visually drift from the trusted demo.

Controls:

- Preserve screenshots or visual notes from the static demo before UI implementation.
- Keep TRD-104 story acceptance as a reference scenario.
- Treat static demo as reference, not source code to copy blindly.

## Rules Prohibiting Accidental Demo Rewrites

- Do not run scaffolding commands in the repository root.
- Do not run `create-next-app` against `.`.
- Do not add Next.js files at root.
- Do not add root `package.json` unless a later ADR approves a workspace.
- Do not change static script load order for operational vNext.
- Do not stage with `git add .` in this mixed workspace.

## Reversal Strategy

If `apps/operational/` proves unsuitable before scaffolding, supersede this ADR. If it proves unsuitable after scaffolding, remove or replace only that directory and its scoped CI/docs, leaving the root static demo intact.

## Open Questions

- [OPEN QUESTION - Medium Impact] Should a root workspace be introduced after `apps/operational/` proves a need for shared packages?
- [OPEN QUESTION - Medium Impact] Which static-demo fixtures should become formal operational acceptance fixtures?
