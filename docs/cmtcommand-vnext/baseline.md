# CMTCommand vNext Baseline

## Current Architecture

CMTCommand is a root-level static HTML/CSS/JavaScript demo. `index.html` loads UMD-style utility scripts, then `app.js` renders the active page into `#app` and wires behavior with delegated and page-specific event listeners. There is no root package manager, lockfile, build system, backend, database, CI config, deployment config, schema, or migration file.

Current tracked root app files include `index.html`, `app.js`, `styles.css`, `demoShared.js`, `operationalCompression.js`, `operationalImpact.js`, `demoWalkthrough.js`, `pilotReadinessPack.js`, `demoControlCenter.js`, and root tests under `tests/`.

Nested `euchre-platform/` files are tracked in the same git repository but are out of scope for the selected CMTCommand vNext slice unless explicitly instructed otherwise.

## Current Primary Workflows

- Tomorrow Readiness and Pilot Story Mode: Catches TRD-104 as a readiness risk, recommends Maria Lopez, records the coverage decision, and shows operational impact.
- Pilot Setup: Exports local CSV templates/data, previews uploaded local CSV files, validates required fields and duplicates, stages local document metadata, and shows review-assisted document field previews.
- Demo QA: Checks utility availability, TRD-104 story health, walkthrough targets, copy materials, operational impact, pilot materials, local storage state, and reset scope.

## Current Verification Baseline

Documented root checks:

```powershell
node --check demoShared.js
node --check demoControlCenter.js
node --check pilotReadinessPack.js
node --check demoWalkthrough.js
node --check operationalImpact.js
node --check operationalCompression.js
node --check app.js
node tests\demoShared.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests
```

No root `npm test`, `npm run lint`, `npm run typecheck`, or `npm run build` command exists.

## Phase 3 Preflight Dirty State

Current branch/worktree at preflight:

- Branch: `master`.
- Worktree: `C:/Users/Surface i7/Documents/CMT Command Center`.
- HEAD: `39c326c3aad15e050f29cf4d61a82597e0b5cf77`.
- No alternate worktree was proven to contain the pre-existing changes, so Phase 3 remains in the current working tree.

Pre-existing root modified files before Phase 3 production edits:

- `app.js`
- `styles.css`

Pre-existing nested `euchre-platform/` modified/untracked files remain out of scope.

Pre-existing untracked local artifacts include `.pnpm-store/`, release ZIP/folder artifacts, screenshots, spreadsheets, outreach files, server logs, and `docs/`.

## Baseline Diff Record For Root `app.js` And `styles.css`

Recorded before any Phase 3 production code edit:

```text
git diff --stat -- app.js styles.css
 app.js     | 179 ++++++++++++++++++++++++++++++++++-----------------------
 styles.css | 189 ++++++++++++++++++++++++++++++++++++++++---------------------
 2 files changed, 233 insertions(+), 135 deletions(-)

git diff --numstat -- app.js styles.css
107 72 app.js
126 63 styles.css
```

Pre-existing `app.js` hunks include copy and flow changes around operational impact labels, pilot materials wording, Demo QA wording, a new `renderUiPolishChecklist`, walkthrough copy, Tomorrow Ops Brief placement/labels, TRD-104 readiness and coverage wording, pickup wording, and Document Field Preview copy.

Pre-existing `styles.css` hunks include palette/shadow adjustments, compact card spacing, UI credibility checklist styles, TRD-104 row highlighting, readiness hero layout changes, command/dark-mode additions for the UI credibility checklist, and other visual polish.

Phase 3 must preserve these baseline hunks unless an intended vNext edit intersects a hunk. If it intersects, inspect surrounding code and preserve existing behavior while adding only the selected intake safety behavior.

## Current Risks

- Pilot Setup currently accepts local CSV and document metadata, then renders parts of the resulting preview through `innerHTML`.
- CSV headers, validation messages derived from headers, file names, and notes are user-controlled local inputs.
- The current root tests cover deterministic utility summaries, but not the private parser/rendering boundary inside `app.js`.
- `app.js` is large and already dirty, so Phase 3 must use surgical edits and inspect per-file diffs carefully.
