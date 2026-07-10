# CMTCommand vNext Charter

## Objective

Upgrade CMTCommand into a production-quality vNext release candidate through explicit, gated phases. Each phase must be worked independently, and work must stop at the end of the phase named by the latest user instruction.

## Release Outcomes

The finished vNext release candidate must include all of the following, adapted to the actual static CMTCommand app:

- A meaningful improvement to the primary user workflow or product capability.
- A material correctness, reliability, security, resilience, or performance improvement.
- A material testing, observability, documentation, CI, or developer-experience improvement.

## Current Product Boundary

Repository evidence at initialization identifies root CMTCommand as a static HTML/CSS/JavaScript demo served from the workspace root. It has no package-managed build, backend, login, database, cloud persistence, external AI, analytics SDK, CRM, ERP, LIMS, payment layer, or deployment workflow in the root app.

The root app's documented entry points are:

- `index.html`: static shell and script load order.
- `app.js`: main state, demo data, rendering, navigation, and event handling.
- `styles.css`: visual system and responsive behavior.
- Utility modules: `demoShared.js`, `operationalCompression.js`, `operationalImpact.js`, `demoWalkthrough.js`, `pilotReadinessPack.js`, and `demoControlCenter.js`.
- Root tests under `tests/`.

Nested projects or artifacts, including `euchre-platform/`, `brackethub/`, `.pnpm-store/`, release ZIPs, screenshots, spreadsheets, local server logs, and exported demo folders, must not be treated as vNext scope without an explicit phase decision supported by repository evidence.

## Hard Constraints

- Repository evidence is the source of truth.
- At every phase start, inspect current git status and read the current project-memory files in `docs/cmtcommand-vnext/`.
- Before editing in any phase, read applicable repository instructions, README/contributor docs, manifests and lockfiles, CI/deployment config, tests, schemas or migrations, and relevant entry points for the selected phase.
- Preserve unrelated user changes.
- Never reset, discard, push, deploy, publish, rotate credentials, alter production resources, or expose secrets.
- Do not add a production dependency without strong evidence.
- Do not weaken or suppress checks to make them pass.
- Never claim a command or workflow passed unless it was run and the result inspected.
- Ask at most one concise question only when blocked by an irreversible product decision, missing authorization, or information that cannot be inferred safely.
- Local commits are allowed only when repository policy permits and must exclude unrelated changes.

## Required Project Memory

Use `docs/cmtcommand-vnext/` as durable project memory:

- `charter.md`: objective, constraints, and definitions of done.
- `baseline.md`: current architecture, workflows, commands, failures, and risks.
- `plan.md`: selected release slice, non-goals, acceptance criteria, file-level plan, compatibility, rollback, and verification.
- `status.md`: phase checklist, decisions, assumptions, blockers, and next phase.
- `verification.md`: exact commands and observed results.
- `review.md`: independent review findings and resolutions.

## Phase Gates

Do not skip ahead or combine phases. At each phase end:

- Update applicable project-memory docs.
- Report changed files.
- Report exact checks run and observed results.
- Report current git state, classified into intended changes and unrelated pre-existing changes.
- Stop for the next phase.

## Definition Of Done

The vNext release candidate is not done until current evidence proves:

- Selected acceptance criteria are satisfied.
- Meaningful automated coverage exists for changed behavior.
- The upgraded workflow has been realistically exercised.
- All applicable verification has been run and inspected.
- No high-severity issue remains unresolved in the changed scope.
- Documentation and project memory are accurate.
- The diff is focused and unrelated work remains untouched.
- Final git state is cleanly classified.
