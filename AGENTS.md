# CMTCommand Agent Guide

## Repository Map

- Root CMTCommand is a static HTML/CSS/JavaScript app served from this directory.
- `index.html` owns the static shell and script load order.
- `app.js` owns demo data, in-memory state, rendering into `#app`, navigation, and event wiring.
- `styles.css` owns the visual system, responsive behavior, dark mode, and command mode.
- UMD utilities with browser globals and CommonJS exports:
  - `demoShared.js`
  - `pilotIntakeSafety.js`
  - `operationalCompression.js`
  - `operationalImpact.js`
  - `demoWalkthrough.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
- `tests/` contains dependency-free Node tests for deterministic utility behavior.
- `docs/cmtcommand-vnext/` is phase memory for the vNext release work, not product runtime.
- `euchre-platform/`, `brackethub/`, release ZIPs/folders, screenshots, workbooks, server logs, and `.pnpm-store/` are outside the root CMTCommand static-app scope unless the user explicitly widens scope.

## Commands

Run the app:

```powershell
python -m http.server 8765
```

Open `http://127.0.0.1:8765/`. If `python` is unavailable on this Windows machine, use the bundled runtime documented in `README.md`.

Verify the root app:

```powershell
node scripts\verify-root.mjs
```

Whitespace check before finishing root changes:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md .github
```

There is no root `package.json`; `npm test`, `npm run build`, `npm run lint`, and `npm run typecheck` are not root CMTCommand commands. Do not add a package manager only to wrap the existing Node checks.

## Architecture Invariants

- `index.html` must load utilities before `app.js`. `pilotIntakeSafety.js` must load before `demoControlCenter.js` and `app.js`.
- Utility files should remain dependency-free UMD modules that expose both a browser global and `module.exports`.
- Root product code has no backend, login, database, cloud persistence, external AI/OCR, analytics SDK, CRM, ERP, LIMS, payment layer, schema migration, or deployment workflow.
- Demo reset must clear only known demo state keys and preserve display preferences and unrelated browser storage.
- TRD-104 must remain risk-bearing before approval; Maria Lopez must remain the recommended qualified coverage option; approval should create a local Decision Log entry and improve the Operational Impact story.

## Trust Boundaries

- Treat local CSV bytes, CSV headers, CSV cells, uploaded file names, document notes, copy payloads, and generated download URLs as untrusted.
- Pilot Setup text derived from local intake data should reach the DOM through `textContent` or explicit DOM-node construction. Do not put imported values directly into `innerHTML` templates.
- CSV export should use `CMTPilotIntakeSafety.rowsToCsv` so spreadsheet formula-leading values are neutralized.
- CSV upload previews are intentionally capped by `CMTPilotIntakeSafety.MAX_CSV_CHARACTERS`; oversized files should become blocked previews before `FileReader.readAsText`.
- URL-valued attributes need a sink-specific allowlist through `CMTPilotIntakeSafety.isAllowedUrl`.
- No pilot workflow should require payroll, pricing, HR notes, sensitive personal data, real credentials, or external integrations.

## Compatibility And Scope Rules

- Preserve the static architecture and existing visual modes unless a task explicitly scopes a broader redesign.
- Keep CSV templates backward compatible when possible; malformed or missing-column CSVs should be blocked, while rows with blank required fields should remain reviewable cleanup warnings.
- Do not add production dependencies, package scripts, backend services, config files, schemas, or migrations without repository evidence and explicit scope.
- Inspect `git status --short --branch` before edits. This workspace commonly contains unrelated root artifacts and `euchre-platform/` work; do not stage, reset, clean, or reformat unrelated files.
- Use explicit file lists for any future staging operation; never use broad staging in this mixed workspace unless the user explicitly asks for it.

## Definition Of Done

- Run `node scripts\verify-root.mjs` for root static-app changes.
- Run the `git diff --check` command above for touched root files.
- For UI/state changes, serve the app and smoke the affected workflow in a browser; include 390px mobile and command/dark mode when layout or rendering changes.
- For Pilot Setup or other trust-boundary changes, include malformed, hostile, oversized, reload, and valid-value cases in tests or browser evidence.
- Update `README.md`, `DEVELOPER_NOTES.md`, and `docs/cmtcommand-vnext/` when commands, invariants, or vNext phase evidence change.
