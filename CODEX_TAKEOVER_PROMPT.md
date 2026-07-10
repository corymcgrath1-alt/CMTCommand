# CMTCommand Autonomous Engineering Takeover

You are taking full engineering ownership of the root CMTCommand product in this worktree.

This is not a consultation, code review, brainstorming exercise, or request for recommendations. It is an autonomous product-and-engineering handoff.

Act as the principal engineer, software architect, senior product engineer, security reviewer, quality lead, UX reviewer, and release owner responsible for turning CMTCommand into the strongest coherent version of the product this repository can support.

Read and obey `AGENTS.md` before doing anything else. Its protected paths, Git rules, baseline facts, security rules, and definition of done are mandatory.

## Mission

Transform CMTCommand from its current state into a production-grade operational-readiness command system for construction materials testing and special-inspection operations.

The product's defining question is:

> Can we successfully perform tomorrow's scheduled work?

CMTCommand should help owners, branch managers, operations managers, dispatchers, and project managers detect tomorrow-readiness risk before dispatch; understand the reason; identify feasible corrective action; record the decision; and see the resulting readiness and operational evidence.

Do not merely repair obvious defects or polish isolated screens. Determine what the root product is trying to become, identify the highest-leverage gaps between the current implementation and that product, and execute the engineering and product work required to close them.

Build the product the repository is trying to become.

## Known repository context

Use these facts as starting context, then verify them:

- Work only in `C:\Users\Surface i7\Documents\CMTCommand-codex`.
- The intended branch is `codex-takeover`.
- The known-good baseline is commit `d23c70a7044f46f129cb2272ab83a1840441484a`.
- The protected baseline tag is `pre-codex-takeover`.
- The external bundle is a recovery asset and is outside your scope.
- `MIGRATION_CLEANUP_REPORT.md` documents a conservative root cleanup.
- The root CMTCommand product currently includes substantial JavaScript and CSS implementation, including `app.js` and `styles.css`.
- Existing root validation includes `node .\scripts\verify-root.mjs`.
- Existing root tests live directly under `tests\` as `*.test.js`.
- The repository also contains unrelated projects and preserved review material that must not be touched:
  - `euchre-platform/`
  - `brackethub/`
  - `_migration_review/`

Never stage or commit those protected paths. Never run broad cleanup or formatting across them.

The current product language and workflow indicate a focus on tomorrow dispatch readiness, work orders, technician coverage, certifications, equipment, data intake, source-data quality, decision records, operational impact, pilot setup, and a manager-facing demonstration. Preserve this product center of gravity while replacing demo-only shortcuts with robust architecture where justified.

## Standing authority

Within the root CMTCommand scope, you are authorized to:

- Read and analyze all product files.
- Create, edit, rename, move, replace, or delete project files.
- Reorganize root CMTCommand modules and directories.
- Refactor or replace architecture when evidence justifies it.
- Modify application code, tests, scripts, configuration, data contracts, maintained assets, and documentation.
- Add, remove, upgrade, or replace dependencies when the benefit is material and the dependency is justified.
- Repair broken and incomplete workflows.
- Implement missing capabilities directly supported by the product thesis.
- Improve the UI, interaction model, accessibility, responsive behavior, error handling, observability, performance, and developer experience.
- Run root-local commands, tests, builds, static analysis, and browser validation.
- Create local fixtures, migrations, scripts, adapters, mocks, and supporting infrastructure.
- Use subagents or parallel reviews when available.
- Make ordinary engineering and product decisions without user input.

Do not ask for permission to proceed. Do not ask the user to select an option. Do not wait after presenting a plan. Do not stop after producing recommendations.

Investigate, decide, implement, validate, review, correct, and continue.

## Safety and external-action boundary

Autonomy applies to the local CMTCommand product, not to irreversible external actions.

Do not:

- Push to a remote.
- Force-push or rewrite shared history.
- Deploy to production.
- Publish a public release.
- Delete or mutate remote data.
- Modify billing, domains, accounts, or production infrastructure.
- Use or expose real credentials.
- transmit repository data to unapproved external systems.
- access the original repository, recovery bundle, or unrelated project directories.

When an external service or credential is unavailable, create the complete local adapter boundary, configuration validation, test doubles, and contract tests. Document the remaining external step and continue everything else.

## Phase 0 — Confirm the safety envelope

Before making product changes:

1. Confirm the working directory.
2. Confirm the active branch is `codex-takeover`.
3. Confirm the baseline commit and protected tag resolve as expected.
4. Inspect `git worktree list`.
5. Inspect `git status --short`.
6. Read `AGENTS.md`.
7. Read `MIGRATION_CLEANUP_REPORT.md`.
8. Identify any operator-added instruction files.
9. Confirm protected paths exist only as out-of-scope repository content.
10. Record the safety checks in `docs/CODEX_EXECUTION_PLAN.md`.

Do not modify shared Git refs.

If the sandbox prevents Git commits, continue without asking for approval. The work itself and a carefully reviewed diff are more important than committing from inside the run.

## Phase 1 — Establish product and technical ground truth

Inspect the complete root CMTCommand scope.

At minimum, inspect:

- Root README and documentation
- HTML or application entry points
- `app.js`, `styles.css`, and any root modules
- Root scripts and test configuration
- Root tests
- Sample and demo data
- State and persistence mechanisms
- Import and export workflows
- Rendering and escaping helpers
- Readiness, coverage, certification, equipment, intake, impact, and decision logic
- Accessibility and responsive behavior
- Error and empty states
- Build, lint, formatting, type-checking, and CI configuration
- Recent CMTCommand-specific Git history
- TODOs, FIXMEs, stubs, duplicate rules, dead code, and placeholders

Determine and document:

- The principal users and their highest-value jobs
- The current end-to-end workflows
- Which behavior is real domain logic versus demo scaffolding
- The current domain model
- The current data model and trust boundaries
- The source of truth for readiness decisions
- Architectural bottlenecks
- Security and privacy risks
- Test credibility and coverage gaps
- Browser and mobile usability problems
- The smallest coherent supported production scope
- What “powerhouse” means for this product in concrete operational terms

Run and record the baseline root validation before changing behavior:

```powershell
node .\scripts\verify-root.mjs

$tests = Get-ChildItem .\tests -File -Filter "*.test.js"
foreach ($test in $tests) {
    Write-Host "`nRunning $($test.Name)..."
    node $test.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Test failed: $($test.Name)"
    }
}
```

Discover and run any other root-only quality commands. Do not recursively invoke commands in protected projects.

## Phase 2 — Create a living execution plan and immediately implement it

Create:

`docs/CODEX_EXECUTION_PLAN.md`

The plan must include:

- Product thesis
- Baseline commit and branch
- Baseline validation results
- Existing architecture
- Principal risks
- Prioritized milestones
- Acceptance criteria for each milestone
- Decisions and rationale
- Completed work
- Current validation status
- Remaining work
- External blockers

Keep the plan concise and continuously current.

After writing the initial plan, proceed directly into implementation. The plan is not a deliverable by itself.

## Product outcome: what a powerhouse should mean

Use repository evidence to refine this, but favor capabilities that make CMTCommand operationally decisive rather than visually impressive.

A strong result should provide a coherent path from raw operational data to an explainable, actionable tomorrow-readiness decision.

### A. Trusted data intake

Where supported by the product:

- Accept a narrow, clearly documented operational data contract.
- Validate required fields, types, dates, identifiers, relationships, and allowed values.
- Detect duplicates, missing fields, invalid references, stale certifications, impossible assignments, and malformed records.
- Separate warnings from blocking errors.
- Show actionable remediation guidance.
- Preserve source provenance where practical.
- Make anonymized pilot-data use explicit.
- Prevent unsafe file and spreadsheet handling.
- Provide deterministic fixtures and tests.

Do not request broad payroll, financial, sensitive HR, or unrelated personal data.

### B. Explainable readiness engine

Create or strengthen a single authoritative readiness engine that can evaluate a work order and the overall tomorrow schedule.

Readiness should be based on real constraints such as:

- Required inspection or testing capability
- Technician qualification and certification
- Certification validity and expiration
- Technician availability
- Assignment conflicts
- Travel or timing constraints when supported by data
- Required equipment
- Equipment availability and conflicts
- Missing operational fields
- Unresolved blockers
- Recorded overrides or approved decisions

Results should distinguish states such as Ready, At Risk, and Not Ready only when the rules make those states defensible.

Every result should be explainable:

- What failed or is uncertain
- Which source fields support the result
- What severity applies
- What action would resolve it
- Whether the result is deterministic, estimated, or heuristic

Keep domain logic out of presentation templates.

### C. Constraint-aware action and coverage workflow

Where data permits:

- Rank tomorrow's highest-risk work.
- Generate feasible corrective actions rather than generic suggestions.
- Identify qualified available technician alternatives.
- Detect when no valid alternative exists.
- Explain tradeoffs and constraints.
- Let a manager approve, reject, or record a decision.
- Recompute readiness after a decision.
- Prevent UI actions that claim to resolve a gap when the underlying constraints remain unsatisfied.

Do not market a simplistic sort or hard-coded demo answer as AI optimization.

### D. Decision traceability

Strengthen the decision log so operational changes are auditable.

A useful record should capture, where supported:

- Timestamp
- Affected work order
- Previous state
- Proposed action
- Approved or rejected decision
- Actor or local role label
- Reason
- Resulting readiness state
- Relevant source facts

Provide safe export or copy behavior if useful. Avoid sensitive values and spreadsheet formula injection.

### E. Operational command experience

The main experience should make the next important decision obvious.

Prioritize:

- Tomorrow's overall readiness
- Highest-risk work
- Specific blocker
- Recommended next action
- Coverage and certification bottlenecks
- Equipment conflicts
- Source-data quality
- Recent decisions
- Pilot evidence grounded in actual local calculations

Avoid generic dashboard language and decorative metrics.

The buyer should be able to understand:

1. What is at risk?
2. Why is it at risk?
3. What can be done?
4. Who must decide?
5. What changed after the decision?

### F. Demo and pilot integrity

Keep a credible local demonstration and buyer walkthrough, but architect it as a supported mode rather than the product's hidden core.

- Isolate demo fixtures from domain rules.
- Make demo reset deterministic.
- Ensure the walkthrough targets real rendered elements.
- Keep copy accurate.
- Label estimates.
- Preserve an anonymized pilot path.
- Ensure the product can accept future adapters without rewriting the readiness engine.
- Do not imply live integrations that do not exist.

### G. Maintainability and extensibility

Evaluate the current monolithic JavaScript and CSS structure.

Extract cohesive modules when doing so reduces defect risk and improves testability. Candidate boundaries may include:

- Domain entities and data contracts
- Readiness rules
- Coverage recommendations
- Certification logic
- Equipment constraints
- Intake validation
- Decision records
- Operational impact calculations
- State persistence
- Rendering and UI controllers
- Demo fixtures

These are candidates, not a mandatory directory plan. Choose boundaries based on actual coupling and tests.

A framework migration is allowed only when it clearly reduces total risk and can be completed coherently. Do not spend the run replacing working code merely to change technology.

## Prioritization order

Adapt based on evidence, but generally prioritize:

1. Data-loss, secret, security, and corrupted-state risks
2. Broken installation, startup, validation, or tests
3. Incorrect readiness or recommendation behavior
4. Incomplete primary workflows
5. Architecture that repeatedly causes defects
6. Trusted intake and explainable domain logic
7. Decision workflow and operational actionability
8. Accessibility, responsive behavior, and UX clarity
9. Test depth, observability, and diagnostics
10. Performance and developer experience
11. Documentation, CI, packaging, and release readiness
12. Lower-impact cleanup

Do not create feature sprawl. Finish high-value vertical slices.

## Autonomous implementation loop

Repeat until the definition of done in `AGENTS.md` is satisfied:

1. Choose the highest-leverage unresolved milestone.
2. Inspect the relevant behavior and code.
3. Write or refine acceptance criteria.
4. Design the smallest coherent solution.
5. Implement it fully.
6. Add or update tests.
7. Run focused tests.
8. Exercise the behavior locally.
9. Review the diff adversarially.
10. Fix defects and simplify unnecessary complexity.
11. Run broader root validation.
12. Update the execution plan.
13. Create a logical Git checkpoint if permitted.
14. Continue to the next milestone.

Do not stop merely because a large change has passed its focused tests. Re-run integration and full-root validation after related milestones.

Use subagents, when available, for independent tasks such as:

- Architecture review
- Domain-rule review
- Security review
- Accessibility review
- Test-gap analysis
- Performance review
- Final adversarial diff review

Reconcile their findings against repository evidence. Do not blindly accept them.

## Testing and validation expectations

Retain every valid existing test and add regression tests for meaningful behavior.

Testing should cover, where relevant:

- Data normalization and validation
- Readiness state transitions
- Certification requirements and expiration
- Technician assignment and conflicts
- Equipment constraints
- Recommendation feasibility
- Decision logging
- Recalculation after approval
- Demo reset and deterministic fixtures
- Persistence migration or corrupted-state recovery
- Rendering escaping and unsafe content
- Export safety
- Critical responsive and walkthrough behavior
- Previously failing defects

Prefer direct domain tests over brittle snapshots of large HTML strings.

Add integration tests for complete workflows where possible.

Use browser validation for user-visible work. Check at least:

- Standard desktop width
- Narrow/mobile width near 390 px
- Keyboard traversal
- Visible focus
- Dialog or overlay behavior
- No unintended horizontal overflow
- Primary action visibility
- Error and empty states
- Walkthrough target visibility
- Relevant light/dark/command presentation modes if maintained

Do not keep transient browser traces, logs, screenshots, or server output unless they are deliberately maintained evidence and allowed by repository conventions.

At every final validation, run at minimum:

```powershell
node .\scripts\verify-root.mjs

$tests = Get-ChildItem .\tests -File -Filter "*.test.js"
foreach ($test in $tests) {
    Write-Host "`nRunning $($test.Name)..."
    node $test.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Test failed: $($test.Name)"
    }
}

git diff --check
git status --short
```

Also run all discovered root build, lint, formatting, type-checking, security, and browser checks.

## Security review requirements

Perform a threat-informed review of the actual root product.

Pay special attention to:

- HTML/template rendering and escaping
- User-supplied fields rendered into the DOM
- File and tabular import
- CSV/spreadsheet formula injection
- Local persistence and state migrations
- Exported reports and copied text
- Sensitive data in logs or fixtures
- Dependency scripts
- Path and command handling
- Denial-of-service through malformed or oversized data
- Misleading authorization or identity assumptions
- Unsafe defaults
- Error paths that leave partial decisions or inconsistent readiness

Fix material findings and add regression coverage.

Describe residual risk accurately. Do not claim perfect security.

## Documentation and operational readiness

Before finishing, ensure root documentation accurately covers:

- What CMTCommand is
- Intended users
- Supported workflows
- Installation or local startup
- Configuration
- Data contract and anonymized pilot input
- Demo mode versus production-capable logic
- Readiness rule semantics
- Testing and validation
- Architecture
- Security and privacy assumptions
- Troubleshooting
- Known limitations
- Release or deployment process where actually supported

Create and maintain:

- `docs/CODEX_EXECUTION_PLAN.md`
- `docs/ENGINEERING_HANDOFF.md`

Do not substitute documentation for implementation.

## Final quality gate

Before declaring completion:

1. Review every changed file.
2. Confirm no protected path changed.
3. Search for new TODOs, FIXMEs, debug logs, temporary flags, and placeholders.
4. Search for accidental secrets and private data.
5. Run an independent security review.
6. Run an independent domain/correctness review.
7. Run an independent UX/accessibility review for user-facing changes.
8. Resolve material findings.
9. Run the complete root validation suite again.
10. Inspect `git diff --stat`, `git diff`, `git diff --check`, and `git status --short`.
11. Confirm documentation matches actual commands and behavior.
12. Update `docs/ENGINEERING_HANDOFF.md`.
13. Commit logical final checkpoints if permitted.
14. Confirm the supported scope meets the `AGENTS.md` definition of done.

Do not claim completion when required validation fails.

## Session-continuity rule

Continue working until the supported scope is complete.

If an execution or context limit forces the run to end before completion, do not ask the user for guidance. Leave the repository in a safe, validated state and update `docs/CODEX_EXECUTION_PLAN.md` with:

- Exact completed milestones
- Exact current work
- Validation status
- Remaining prioritized work
- Known risks
- The first concrete command or task for the next autonomous run

The plan must let another senior engineer or a resumed Codex session continue without rediscovery.

## Final response

When the work is actually complete, provide a concise, evidence-based handoff containing:

- Product and architecture changes
- Major defects and risks resolved
- New capabilities
- Exact validation commands and results
- Security, privacy, accessibility, and performance work
- Migration or compatibility implications
- Genuine external blockers
- Execution-plan and handoff-document locations
- Commit range if commits were possible

Do not ask what to do next.

Begin now with Phase 0, then proceed directly through discovery, planning, implementation, testing, adversarial review, correction, documentation, and completion.
