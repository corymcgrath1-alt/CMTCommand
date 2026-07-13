# CMTCommand Agent Guide

This file is the operational front door for root CMTCommand. It is intentionally concise; durable product, architecture, domain, UI, security, testing, operations, and roadmap details live in [docs/CMTCOMMAND_BIBLE/00_INDEX.md](docs/CMTCOMMAND_BIBLE/00_INDEX.md).

## Mission And Engineering Priorities

Optimize for:

1. Correctness.
2. User-visible behavior.
3. Data integrity.
4. Security.
5. Small, reviewable changes.
6. Compatibility with existing architecture.
7. Verifiable results.
8. Maintainability.

Producing more code or changing more files is not a measure of success.

## Required Reading

| Type of task | Required documents |
| --- | --- |
| Any code change | [00_INDEX](docs/CMTCOMMAND_BIBLE/00_INDEX.md), [06_ENGINEERING_STANDARDS](docs/CMTCOMMAND_BIBLE/06_ENGINEERING_STANDARDS.md), [10_TESTING_AND_ACCEPTANCE](docs/CMTCOMMAND_BIBLE/10_TESTING_AND_ACCEPTANCE.md) |
| Domain behavior | [02_DOMAIN_MODEL_AND_GLOSSARY](docs/CMTCOMMAND_BIBLE/02_DOMAIN_MODEL_AND_GLOSSARY.md), [03_USERS_ROLES_AND_WORKFLOWS](docs/CMTCOMMAND_BIBLE/03_USERS_ROLES_AND_WORKFLOWS.md) |
| Architecture or module boundaries | [04_SYSTEM_ARCHITECTURE](docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md), [05_DATA_MODEL_AND_INTEGRATIONS](docs/CMTCOMMAND_BIBLE/05_DATA_MODEL_AND_INTEGRATIONS.md) |
| UI work | [07_UI_AND_DESIGN_SYSTEM](docs/CMTCOMMAND_BIBLE/07_UI_AND_DESIGN_SYSTEM.md) |
| Security, privacy, uploads, or permissions | [09_SECURITY_PRIVACY_AND_PERMISSIONS](docs/CMTCOMMAND_BIBLE/09_SECURITY_PRIVACY_AND_PERMISSIONS.md) |
| Feature inventory or new feature | [08_FEATURE_CATALOG_AND_STATUS](docs/CMTCOMMAND_BIBLE/08_FEATURE_CATALOG_AND_STATUS.md), [FEATURE_SPEC_TEMPLATE](docs/CMTCOMMAND_BIBLE/templates/FEATURE_SPEC_TEMPLATE.md) |
| Deployment or operations | [11_DEPLOYMENT_AND_OPERATIONS](docs/CMTCOMMAND_BIBLE/11_DEPLOYMENT_AND_OPERATIONS.md) |
| Product or technical decisions | [12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS](docs/CMTCOMMAND_BIBLE/12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS.md), [ARCHITECTURE_DECISION_TEMPLATE](docs/CMTCOMMAND_BIBLE/templates/ARCHITECTURE_DECISION_TEMPLATE.md) |
| Bug fix | [BUG_FIX_TEMPLATE](docs/CMTCOMMAND_BIBLE/templates/BUG_FIX_TEMPLATE.md), [10_TESTING_AND_ACCEPTANCE](docs/CMTCOMMAND_BIBLE/10_TESTING_AND_ACCEPTANCE.md) |
| Review | [CODE_REVIEW_CHECKLIST](docs/CMTCOMMAND_BIBLE/templates/CODE_REVIEW_CHECKLIST.md) |

## Inspect Before Editing

Before modifying files:

- Check `git status --short --branch`.
- Read affected files and their callers.
- Search for existing similar behavior.
- Read related tests.
- Inspect schemas, public interfaces, route/API surfaces, and configuration when relevant.
- Preserve unrelated user changes.
- Confirm actual commands from repository configuration and docs.

## Scope Control

- Make small, surgical diffs.
- Do not perform unrelated refactors.
- Do not add speculative abstractions.
- Do not broadly reformat.
- Do not rename files or public concepts unless required.
- Do not manually edit generated artifacts.
- Do not change lockfiles unless dependency changes require it.
- Do not change public interfaces unless required and tested.
- Do not silently change product behavior.
- Do not stage, reset, clean, or reformat unrelated files.

This workspace contains unrelated active work under `euchre-platform/`; treat it as out of scope unless the user explicitly widens scope.

## Project Conventions

- Root CMTCommand is a static HTML/CSS/JavaScript app.
- `index.html` owns the shell and script load order.
- `app.js` owns demo data, in-memory state, rendering into `#app`, navigation, and event wiring.
- `styles.css` owns the visual system, responsive behavior, dark mode, and Command Center mode.
- Utility files are dependency-free UMD modules with browser globals and CommonJS exports:
  - `demoShared.js`
  - `pilotIntakeSafety.js`
  - `operationalCompression.js`
  - `operationalImpact.js`
  - `demoWalkthrough.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
- `tests/` contains dependency-free Node tests for deterministic utility behavior.
- `.github/workflows/root-static-checks.yml` runs the root verifier in CI.
- `docs/cmtcommand-vnext/` is phase memory for the Trusted Pilot Intake and Render Safety release, not product runtime.
- `docs/CMTCOMMAND_BIBLE/` is durable repository operating documentation.
- `euchre-platform/`, `brackethub/`, `_migration_review/`, release ZIPs/folders, screenshots, workbooks, server logs, and `.pnpm-store/` are outside root CMTCommand scope unless explicitly requested.

See [04_SYSTEM_ARCHITECTURE](docs/CMTCOMMAND_BIBLE/04_SYSTEM_ARCHITECTURE.md), [06_ENGINEERING_STANDARDS](docs/CMTCOMMAND_BIBLE/06_ENGINEERING_STANDARDS.md), and [07_UI_AND_DESIGN_SYSTEM](docs/CMTCOMMAND_BIBLE/07_UI_AND_DESIGN_SYSTEM.md) for details.

## Commands

Dependency installation:

```powershell
# No root dependency install command found; root CMTCommand has no package.json.
```

Run locally:

```powershell
python -m http.server 8765
```

Open:

```text
http://127.0.0.1:8765/
```

If default Python is unavailable, use the bundled Python runtime documented in `README.md`.

Focused/full root verification:

```powershell
node scripts\verify-root.mjs
```

Whitespace/diff check:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md .github docs/CMTCOMMAND_BIBLE
```

Commands not found for root CMTCommand:

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run format`
- Database migration/generation commands

Do not invent package scripts to wrap the existing Node checks.

## Debugging Rules

Use evidence-driven debugging:

1. Reproduce the failure.
2. Read the complete error.
3. Identify the failing path.
4. Add or update a regression test.
5. Verify the failure before the fix when practical.
6. Fix the root cause.
7. Run related verification after the fix.

Do not:

- Swallow exceptions.
- Weaken tests to obtain a pass.
- Disable lint/type/check gates.
- Add unexplained retries.
- Add null checks without investigating unexpected nulls.
- Guess repeatedly without gathering evidence.

## Dependencies

Before adding any dependency, check:

- Existing utilities and browser/Node standard-library alternatives.
- Maintenance implications.
- Security implications.
- Runtime or bundle impact.
- Licensing implications when relevant.

Do not add dependencies for minor convenience. Root CMTCommand currently has no package manager.

## High-Risk Changes

Use explicit caution before changes involving:

- Authentication or authorization.
- Tenant or customer data separation.
- Database migrations.
- Destructive operations.
- File uploads.
- Secrets.
- Personally identifiable information.
- Payments.
- Command execution.
- Public network exposure.
- Deployment infrastructure.

Root CMTCommand currently has no backend/auth/database. Adding any of the above is a product/architecture decision, not an incidental implementation detail.

## Verification

Report exactly what you ran. Never claim tests pass unless they were executed.

When verification cannot be run, report:

- What was not run.
- Why it was not run.
- The exact command that should be run.
- What remains uncertain.

For UI/state changes, serve the app and smoke the affected workflow in a browser. Include 390px mobile plus Command Center/dark mode when layout or rendering changes.

For Pilot Setup or other trust-boundary changes, include malformed, hostile, oversized, reload, and valid-value cases in tests or browser evidence.

## Documentation Maintenance

Update relevant documentation when a change materially alters:

- Domain terminology.
- Architecture.
- Data models.
- Permissions.
- User workflows.
- Feature status.
- UI conventions.
- Development commands.
- Deployment behavior.

Do not require unrelated documentation edits for every code change. Do update [docs/CMTCOMMAND_BIBLE](docs/CMTCOMMAND_BIBLE/00_INDEX.md) when durable guidance changes.

## Completion Format

Future Codex responses for repository work should include:

```text
## Summary
## Changed Areas
## Verification
## Assumptions and Caveats
```

Keep responses concise, concrete, and grounded in files/commands actually touched or run.
