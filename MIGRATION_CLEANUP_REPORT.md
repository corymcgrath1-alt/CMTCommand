# CMTCommand Repository Cleanup Report

Date: 2026-07-10

## Safety Rule Applied

No files were permanently deleted. Files that were clearly generated, local-only, or uncertain were moved into `_migration_review/` so they can be inspected or restored later. `_migration_review/` is ignored by Git.

No files were staged, committed, reset, or cleaned.

## CMTCommand Files Kept In Place

The root CMTCommand app is the static HTML/CSS/JavaScript app. These files and folders belong to the root project and were kept in place:

- `index.html`
- `app.js`
- `styles.css`
- `demoShared.js`
- `pilotIntakeSafety.js`
- `operationalCompression.js`
- `operationalImpact.js`
- `demoWalkthrough.js`
- `pilotReadinessPack.js`
- `demoControlCenter.js`
- `tests/`
- `scripts/verify-root.mjs`
- `.github/workflows/root-static-checks.yml`
- `README.md`
- `DEVELOPER_NOTES.md`
- `AGENTS.md`
- `docs/cmtcommand-vnext/`

Within `docs/cmtcommand-vnext/artifacts/`, `phase5-browser-validation.cjs` was kept because it is a repeatable validation script. Generated JSON and PNG outputs from that script were moved.

## Unrelated Projects Identified

`euchre-platform/` is a separate tracked Next.js project, not part of the root CMTCommand static app. It has active modified and untracked work, so I did not move the project code. Recommended next step: split it into its own repository after the current work is backed up or committed.

`brackethub/` is a separate ignored local app directory. It is already outside CMTCommand source control through `.gitignore`. Recommended next step: keep it ignored or move it to a sibling folder / separate repository.

## Moves Made

| Source | Destination | Why |
| --- | --- | --- |
| `CMTCommand-20260617-091149.zip` | `_migration_review/release-exports/CMTCommand-20260617-091149.zip` | Old release ZIP export; zero-byte artifact preserved for review. |
| `CMTCommand-app-only-20260617-091428.zip` | `_migration_review/release-exports/CMTCommand-app-only-20260617-091428.zip` | Old app-only release ZIP export; not live source. |
| `CMTCommand-demo-release-20260623.zip` | `_migration_review/release-exports/CMTCommand-demo-release-20260623.zip` | Generated demo release ZIP; not live source. |
| `CMTCommand-demo-release-20260623/` | `_migration_review/release-exports/CMTCommand-demo-release-20260623/` | Generated release folder copy of root app; preserved outside live root. |
| `CMTCommand_Product_Planning_Workbook.xlsx` | `_migration_review/workbooks/CMTCommand_Product_Planning_Workbook.xlsx` | Local planning workbook; not runtime source. |
| `Competitor Research.xlsx` | `_migration_review/workbooks/Competitor Research.xlsx` | Local competitor research workbook; not runtime source. |
| `demo-outreach-script.md` | `_migration_review/planning-notes/demo-outreach-script.md` | Local outreach note; preserved for review instead of kept in app root. |
| `outreach-tracker.csv` | `_migration_review/planning-notes/outreach-tracker.csv` | Local outreach tracker CSV; not runtime source. |
| `euchre-platform/server-3002.err.log` | `_migration_review/logs/euchre-platform/server-3002.err.log` | Nested project local server log; preserved without touching code. |
| `euchre-platform/server-3002.log` | `_migration_review/logs/euchre-platform/server-3002.log` | Nested project local server log; preserved without touching code. |
| `euchre-platform/server-3002.out.log` | `_migration_review/logs/euchre-platform/server-3002.out.log` | Nested project local server log; preserved without touching code. |
| `cmtcommand-readiness-demo-workflow.png` | `_migration_review/run-evidence/cmtcommand-readiness-demo-workflow.png` | Untracked local screenshot / evidence artifact. |
| `cmtcommand-tomorrow-readiness-desktop.png` | `_migration_review/run-evidence/cmtcommand-tomorrow-readiness-desktop.png` | Untracked local screenshot / evidence artifact. |
| `cmtcommand-tomorrow-readiness-home.png` | `_migration_review/run-evidence/cmtcommand-tomorrow-readiness-home.png` | Untracked local screenshot / evidence artifact. |
| `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.json` | `_migration_review/run-evidence/phase5/phase5-browser-validation.json` | Generated browser validation output; reproducible from tracked script. |
| `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-narrow-after.png` | `_migration_review/run-evidence/phase5/phase5-pilot-setup-narrow-after.png` | Generated browser validation screenshot. |
| `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-narrow.png` | `_migration_review/run-evidence/phase5/phase5-pilot-setup-narrow.png` | Generated browser validation screenshot. |
| `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-wide-after.png` | `_migration_review/run-evidence/phase5/phase5-pilot-setup-wide-after.png` | Generated browser validation screenshot. |
| `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-wide.png` | `_migration_review/run-evidence/phase5/phase5-pilot-setup-wide.png` | Generated browser validation screenshot. |
| `cmtcommand-dashboard.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dashboard.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-dashboard-desktop.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dashboard-desktop.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-dashboard-redesign.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dashboard-redesign.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-dispatch.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dispatch.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-dispatch-desktop.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dispatch-desktop.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-dispatch-redesign.png` | `_migration_review/tracked-root-screenshots/cmtcommand-dispatch-redesign.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-mobile-dispatch-redesign.png` | `_migration_review/tracked-root-screenshots/cmtcommand-mobile-dispatch-redesign.png` | Tracked root screenshot; unreferenced by runtime. |
| `cmtcommand-mobile-redesign.png` | `_migration_review/tracked-root-screenshots/cmtcommand-mobile-redesign.png` | Tracked root screenshot; unreferenced by runtime. |
| `.pnpm-store/` | `_migration_review/caches/.pnpm-store/` | Local package-manager cache; not source. |
| `src/` | `_migration_review/empty-root-scaffolds/src/` | Empty root scaffold directory; no source files present. |
| `migrations/` | `_migration_review/empty-root-scaffolds/migrations/` | Empty root scaffold directory; no migration files present. |

## Items Not Moved

`server-8765.err` and `server-8765.out` could not be moved because the local static server is holding them open. They remain in the root, but `.gitignore` now ignores them.

`euchre-platform/` code was not moved because it is a separate active project with existing modified and untracked work. Moving it during this cleanup would mix repo hygiene with in-progress app work.

`brackethub/` was not moved because it is already ignored and should be split or relocated deliberately, not folded into a CMTCommand cleanup commit.

## Gitignore Improvements

`.gitignore` now covers:

- Local Codex / agent state
- `_migration_review/`
- Dependency and build caches
- Logs and dev-server output
- ZIP release/export bundles
- Local planning spreadsheets / outreach artifacts
- Generated screenshots and browser-run evidence

## Recommended Repository Split

Suggested target structure:

```text
Documents/
  CMTCommand/
    index.html
    app.js
    styles.css
    demo*.js
    pilot*.js
    operational*.js
    tests/
    scripts/
    docs/
  euchre-platform/
    package.json
    src/
    migrations/
  brackethub/
    package.json
    prisma/
    src/
```

For `euchre-platform/`, use a deliberate split workflow such as `git subtree split --prefix=euchre-platform` or a history-filtering tool, then remove the nested project from the CMTCommand repository only after the separate repository is verified.
