# CMTCommand Agent Operating Guide

## 1. Repository identity and assignment

This worktree is the autonomous engineering workspace for **CMTCommand**.

CMTCommand is the root product: a tomorrow-readiness command system for construction materials testing and special-inspection operations. The agent may inspect, redesign, create, edit, move, replace, or delete files that belong to the root CMTCommand product when justified by product quality, correctness, security, maintainability, usability, or release readiness.

This is an engineering handoff, not a consultation. Do not ask the user to choose between ordinary engineering alternatives. Investigate the repository, make the best evidence-based decision, record consequential assumptions, implement the decision, validate it, and continue.

The authority in this guide is limited by the protected-path, Git-safety, secret-handling, data-handling, and external-action rules below.

## 2. Baseline and rollback facts

The known-good pre-takeover baseline is:

- Baseline commit: `d23c70a7044f46f129cb2272ab83a1840441484a`
- Protected annotated tag: `pre-codex-takeover`
- Autonomous branch: `codex-takeover`
- Original development branch: `feat/trusted-pilot-intake-safety`
- Original repository location: `C:\Users\Surface i7\Documents\CMT Command Center`
- Autonomous worktree location: `C:\Users\Surface i7\Documents\CMTCommand-codex`
- External recovery bundle: `C:\Users\Surface i7\Documents\CMTCommand-pre-codex-takeover.bundle`

The original repository and external recovery bundle are outside the assignment. Do not read, alter, move, overwrite, or delete them.

Remain on `codex-takeover`. Never delete, move, recreate, or retarget `pre-codex-takeover`. Never switch to or modify the original development branch.

At the start of a takeover run, verify:

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse "pre-codex-takeover^{commit}"
git status --short --branch
git worktree list
```

`HEAD` should initially resolve to the baseline commit. Operator-supplied instruction files such as `AGENTS.md` and `CODEX_TAKEOVER_PROMPT.md` may be present as intentional additions. Treat any other unexpected change as pre-existing work: preserve it, document it, and do not overwrite it blindly.

## 3. Absolute project boundaries

The following paths are independent products or preserved migration material and are outside CMTCommand scope:

- `euchre-platform/`
- `brackethub/`
- `_migration_review/`

Do not edit, create, move, delete, format, install dependencies for, run tests for, stage, or commit anything inside those paths. Do not use them as scratch space.

Release ZIPs and folders, screenshots, workbooks, local planning files, server logs, browser evidence, `.pnpm-store/`, and similar generated or review artifacts are outside the root static-app runtime unless repository evidence and the takeover task explicitly place a particular artifact in scope.

Do not run broad repository commands that can mutate protected paths. In particular, do not use repository-wide formatters, codemods, dependency installers, cleanup utilities, or recursive scripts unless their path scope explicitly excludes all protected paths.

`MIGRATION_CLEANUP_REPORT.md` records the root cleanup and classification work. Read it before reorganizing the root. It may be updated only to document relevant CMTCommand cleanup facts; it is not authorization to touch protected paths.

## 4. Repository map

The current root CMTCommand product is a static HTML/CSS/JavaScript application served from the repository root.

- `index.html` owns the static shell and script load order.
- `app.js` owns demo data, in-memory state, rendering into `#app`, navigation, and event wiring.
- `styles.css` owns the visual system, responsive behavior, dark mode, and command mode.
- Dependency-free UMD utilities expose both browser globals and CommonJS exports:
  - `demoShared.js`
  - `pilotIntakeSafety.js`
  - `operationalCompression.js`
  - `operationalImpact.js`
  - `demoWalkthrough.js`
  - `pilotReadinessPack.js`
  - `demoControlCenter.js`
- `tests/` contains dependency-free Node tests for deterministic utility behavior.
- `scripts/` contains root verification and support scripts.
- `docs/cmtcommand-vnext/` is phase memory and release evidence for vNext work, not product runtime.

Read the root `README.md`, `DEVELOPER_NOTES.md`, `MIGRATION_CLEANUP_REPORT.md`, relevant `docs/cmtcommand-vnext/` material, root source files, scripts, and tests before changing architecture or behavior.

## 5. Current commands

Run the app:

```powershell
python -m http.server 8765
```

Open `http://127.0.0.1:8765/`. If `python` is unavailable on this Windows machine, use the bundled runtime documented in `README.md`.

Verify the root app:

```powershell
node .\scripts\verify-root.mjs
```

Run every root test without recursing into protected projects:

```powershell
$tests = Get-ChildItem .\tests -File -Filter "*.test.js"
foreach ($test in $tests) {
    Write-Host "`nRunning $($test.Name)..."
    node $test.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Test failed: $($test.Name)"
    }
}
```

Whitespace check for the established root surface:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md CODEX_TAKEOVER_PROMPT.md .github docs
```

There is currently no root `package.json`. `npm test`, `npm run build`, `npm run lint`, and `npm run typecheck` are not established root CMTCommand commands. Do not add a package manager merely to wrap existing Node checks.

If the architecture is intentionally expanded later, introduce new tooling only when it materially improves the product, can be completed coherently, and is documented with reproducible commands. Do not add tooling for appearance or convention alone.

## 6. Product thesis

CMTCommand's central operational question is:

> Can the organization successfully perform tomorrow's scheduled work?

The product should reconcile, where supported by repository evidence:

- Tomorrow's schedule and work orders
- Job, client, site, inspection, and testing requirements
- Technician availability and assignment
- Technician qualifications and certifications
- Certification status and expiration risk
- Required equipment and equipment availability
- Coverage conflicts and operational bottlenecks
- Intake completeness and source-data quality
- Recommended actions and feasible coverage alternatives
- Manager approval and decision history
- Explainable operational impact and pilot evidence

Primary users include owners, branch managers, operations managers, dispatchers, project managers, and people responsible for making tomorrow's field work executable.

CMTCommand is not a generic dashboard, CRM, payroll product, HR platform, broad ERP, LIMS replacement, or unrelated project-management suite. Do not dilute the product with feature sprawl. Strengthen the tomorrow-readiness workflow and adjacent capabilities that directly support it.

Preserve the strongest buyer story: scheduled work is not necessarily ready work. The system should surface risk before dispatch, explain why it exists, recommend an actionable resolution, record the decision, and update readiness.

## 7. Existing architecture invariants

Preserve these invariants unless a validated, complete replacement explicitly supersedes them:

- `index.html` loads utilities before `app.js`.
- `pilotIntakeSafety.js` loads before `demoControlCenter.js` and `app.js`.
- Existing utility files remain dependency-free UMD modules that expose a browser global and `module.exports` unless they are migrated as part of a coherent, fully validated architecture change.
- Root product code currently has no backend, login, database, cloud persistence, external AI/OCR, analytics SDK, CRM, ERP, LIMS, payment layer, schema migration, or deployment workflow.
- Demo reset clears only known demo-state keys and preserves display preferences and unrelated browser storage.
- TRD-104 remains risk-bearing before approval.
- Maria Lopez remains the recommended qualified coverage option in the established demo story.
- Approval creates a local Decision Log entry and improves the Operational Impact story.

The takeover assignment may authorize broader redesign, but do not discard these invariants casually. A major migration must:

1. Be supported by repository and product evidence.
2. Produce a simpler or materially more capable system.
3. Preserve validated user behavior or intentionally replace it with documented behavior.
4. Avoid a long-lived half-migrated state.
5. Include tests, documentation, and a rollback-aware transition.

Prefer incremental modularization or targeted replacement when it can deliver the same value with less risk. Do not rewrite the application merely to adopt a fashionable framework.

## 8. Product-development principles

Prefer complete vertical workflows over collections of disconnected features.

A valuable workflow generally moves through:

1. Data intake or existing operational data
2. Normalization and validation
3. Deterministic readiness analysis
4. Explainable risks and constraints
5. Feasible recommended actions
6. Human approval or recorded decision
7. Updated readiness state
8. Traceable outcome or evidence

Keep demo fixtures and production-capable logic separate. The existing TRD-104 and Maria Lopez scenario may remain as a valuable deterministic demo, but core rules must not depend on hard-coded demo identities.

Do not claim predictive intelligence, savings, compliance, security, or operational certainty that the implementation cannot substantiate. Label estimates, heuristics, and local demo evidence accurately.

Do not broaden the product scope merely to demonstrate activity. Implement the smallest coherent set of changes that produces the largest real improvement.

## 9. Trust boundaries and security

Treat local CSV bytes, CSV headers, CSV cells, uploaded file names, document notes, copy payloads, generated download URLs, local-storage contents, query parameters, and all imported values as untrusted.

- Pilot Setup text derived from local intake data should reach the DOM through `textContent` or explicit DOM-node construction. Do not place imported values directly into `innerHTML` templates.
- CSV export should use `CMTPilotIntakeSafety.rowsToCsv` so spreadsheet formula-leading values are neutralized.
- CSV upload previews are intentionally capped by `CMTPilotIntakeSafety.MAX_CSV_CHARACTERS`; oversized files should become blocked previews before `FileReader.readAsText`.
- URL-valued attributes require a sink-specific allowlist through `CMTPilotIntakeSafety.isAllowedUrl`.
- No pilot workflow should require payroll, pricing, HR notes, sensitive personal data, real credentials, or external integrations.

Never print, expose, copy, transmit, or commit secrets. Do not commit:

- Real API keys or tokens
- Passwords or credentials
- Private keys or certificates
- Sensitive employee, customer, payroll, HR, pricing, or production data
- Unredacted production exports
- Local databases containing private data

Use anonymized fixtures and `.env.example`-style documentation where configuration is genuinely required.

Review relevant code for:

- DOM-based and stored cross-site scripting
- Unsafe HTML interpolation and inconsistent escaping
- CSV, JSON, spreadsheet, and file-import validation
- Formula injection in exported tabular data
- Unsafe URL sinks
- Path traversal and unsafe file operations
- Command injection
- Unsafe deserialization
- Sensitive values in logs
- Authorization assumptions
- Corrupted or partial persistent state
- Unbounded input or resource use
- Dependency risk
- Error paths that leave inconsistent state

Add regression tests for material findings whenever practical.

## 10. Compatibility and scope rules

- Preserve the static architecture and established visual modes by default. A broader redesign is allowed only when the takeover task explicitly authorizes it and evidence shows the migration is worth the cost and can be completed coherently.
- Keep CSV templates backward compatible when practical.
- Malformed or missing-column CSVs should be blocked.
- Rows with blank required fields should remain reviewable cleanup warnings unless accepting them would make downstream behavior unsafe or misleading.
- Do not add production dependencies, backend services, config files, schemas, migrations, or external integrations without repository evidence, clear product value, and complete validation.
- Do not turn local demo behavior into implied production integration.
- Preserve display preferences and unrelated browser storage during reset operations.
- Update `README.md`, `DEVELOPER_NOTES.md`, and relevant `docs/cmtcommand-vnext/` material when commands, invariants, architecture, or phase evidence change.

## 11. Engineering standards

Every change must improve coherence.

Prefer:

- Explicit domain models and contracts
- Pure, deterministic readiness and constraint logic
- Clear separation among domain logic, data adapters, state, and presentation
- Small composable modules
- One source of truth for business rules
- Strong validation at trust boundaries
- Secure defaults
- Actionable errors
- Idempotent operations where appropriate
- Accessible semantic interfaces
- Responsive layouts
- Reproducible validation
- Focused dependencies
- Tests of observable behavior
- Documentation that matches actual behavior

Do not:

- Disable, delete, skip, or weaken tests merely to pass validation
- Weaken validation or security controls to hide defects
- Swallow errors without an intentional recovery strategy
- Leave placeholder production paths
- Add speculative abstractions or dependencies without current value
- Duplicate business rules across UI and domain code
- Hard-code output solely to satisfy tests
- Manufacture passing tests with mocks that bypass the behavior under test
- Conceal uncertainty behind authoritative product copy
- Preserve dead code or accidental complexity without evidence it is required
- Add infrastructure simply to make the repository look more conventional

When changing public behavior, update tests and documentation in the same milestone.

## 12. Git discipline

Use Git as a review and recovery mechanism, not as a destructive cleanup tool.

Remain on `codex-takeover`.

Never:

- Force-push
- Push to any remote
- Rewrite shared history
- Rebase or reset the original branch
- Delete or retarget `pre-codex-takeover`
- Run `git clean`
- Run broad `git reset --hard`
- Run broad `git checkout -- .`
- Run broad `git restore .`
- Use `git add -A`
- Use `git add .`
- Use `git commit -am`
- Stage protected paths

Stage explicit CMTCommand paths only. Before each commit, inspect:

```powershell
git diff --cached --name-status
git diff --cached
git diff --check --cached
```

No staged path may begin with `euchre-platform/`, `brackethub/`, or `_migration_review/`.

Create small, logically grouped checkpoint commits when the environment permits Git metadata writes. Use messages that state the product or engineering outcome. If sandbox policy prevents commits, do not stop and do not request user approval; continue implementation, keep the execution plan current, and leave a clean, reviewed working diff.

Do not include generated logs, caches, local package stores, transient screenshots, browser traces, ZIP exports, or workbooks unless a specific artifact is intentionally maintained product documentation.

## 13. Initial discovery and baseline validation

Before changing behavior:

1. Read this file.
2. Read `CODEX_TAKEOVER_PROMPT.md` when present.
3. Read `MIGRATION_CLEANUP_REPORT.md`.
4. Read the root README and developer documentation.
5. Inspect root entry points, source files, scripts, tests, configuration, fixtures, and assets.
6. Inspect relevant `docs/cmtcommand-vnext/` phase memory.
7. Search root scope for TODOs, FIXMEs, stubs, duplicate rules, unsafe rendering, and abandoned code.
8. Inspect recent history relevant to the root product.
9. Establish the current product workflows and architecture.
10. Run current root verification and tests.

Record baseline commands and results in `docs/CODEX_EXECUTION_PLAN.md`.

Do not assume documented commands work. Verify them.

## 14. Autonomous execution loop

For each milestone:

1. Select the highest-leverage unresolved product or engineering problem.
2. Inspect the relevant code, tests, documentation, and behavior.
3. Define the smallest coherent solution.
4. Implement the complete vertical change.
5. Add or update meaningful tests.
6. Run focused validation.
7. Inspect the diff for regressions, security issues, unnecessary complexity, and scope violations.
8. Correct findings.
9. Run broader root validation.
10. Update the execution plan.
11. Commit an explicit checkpoint if permitted.
12. Continue without waiting for user input.

Do not stop after an audit, roadmap, architecture memo, or partial scaffold.

When ambiguity remains after repository investigation, choose the safest reversible design that best advances the product thesis. Record consequential assumptions and continue.

When an external credential, private service, legal decision, production account, or physical action is unavailable:

- Build the complete local architecture and integration boundary
- Add configuration validation
- Add mocks, fakes, fixtures, or contract tests
- Verify all local behavior
- Document the exact external requirement
- Continue all other work

Do not deploy to production, modify billing, purchase services, delete remote data, publish releases, or perform other irreversible external actions.

## 15. Long-horizon documentation

Create and maintain:

- `docs/CODEX_EXECUTION_PLAN.md`
- `docs/ENGINEERING_HANDOFF.md`

The execution plan is a living operational record containing:

- Current product understanding
- Baseline state and validation results
- Architecture findings
- Prioritized milestones
- Decisions and rationale
- Completed work
- Current validation status
- Remaining work
- Genuine external blockers

Keep it concise, current, and useful for resuming after context limits.

The engineering handoff is the final durable record containing:

- Initial condition
- Product thesis
- Major architecture decisions
- Features and repairs completed
- Important files and subsystems changed
- Test and validation evidence
- Security and reliability work
- Migration and compatibility notes
- Genuine remaining limitations
- Optional future opportunities

Create or update architecture, security, data-contract, or operational documentation only where it materially helps maintain the product.

## 16. Definition of done

The supported CMTCommand scope is complete when all reasonably achievable conditions are satisfied:

- A fresh developer can understand and run the root product from accurate documentation.
- Root bootstrap steps are reproducible.
- Root verification commands pass.
- Root automated tests pass.
- Critical readiness workflows have meaningful regression coverage.
- Core rules are not dependent on hard-coded demo identities.
- Data intake and validation fail safely and explain errors.
- Readiness results are deterministic and explainable.
- Recommended actions are tied to real constraints and do not overclaim certainty.
- Important decisions can be traced.
- Main workflows are usable with keyboard navigation and assistive technology where applicable.
- Desktop and 390px/mobile layouts avoid destructive overflow and preserve primary actions.
- Standard, dark, and command modes remain coherent when their surfaces are affected.
- Errors and empty states are actionable.
- High-severity correctness and security defects discovered during the work are resolved.
- Configuration is validated and documented when applicable.
- No secrets or sensitive real-world data are committed.
- Demo fixtures are clearly separated from reusable domain logic.
- Repeatable validation covers important quality gates where practical.
- User-facing copy accurately describes implemented capabilities.
- Dead code and obsolete scaffolding are removed when safe.
- Documentation matches actual behavior.
- The final diff has received an adversarial review.
- Full root validation has been rerun after final review.
- No protected path was changed.
- The only remaining limitations are genuinely external, low priority, or explicitly justified.

For UI or state changes, serve the app and smoke-test the affected workflow in a browser. Include 390px mobile and command/dark modes when layout or rendering changes.

For Pilot Setup and other trust-boundary changes, include malformed, hostile, oversized, reload, and valid-value cases in tests or browser evidence.

“Done” does not mean no future feature can be imagined. It means CMTCommand is coherent, reliable, secure for its supported scope, demonstrably useful, and substantially stronger than the baseline without known locally fixable critical defects.

## 17. Final response requirements

Do not ask the user what to do next.

The final response must state:

- What changed
- Why the major changes were necessary
- The resulting product capabilities and architecture
- Exact validation commands run
- Test, verification, lint, build, and type-check results, noting which categories do not apply
- Security and reliability work
- Compatibility or migration notes
- Any genuine external blocker
- Locations of the execution plan and engineering handoff
- Whether changes were committed and, if so, the commit range

Do not claim completion while required validation is failing.
