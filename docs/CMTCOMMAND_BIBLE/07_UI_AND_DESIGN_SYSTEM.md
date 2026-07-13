# UI And Design System

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `README.md`
  - `DEVELOPER_NOTES.md`
  - `docs/cmtcommand-vnext/status.md`
  - `docs/cmtcommand-vnext/verification.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
- Last Reviewed: 2026-07-13

## Current Demo - Implemented Standards

Shell:

- Sidebar navigation.
- Role selector.
- Main workspace.
- Topbar with role eyebrow, page title, global search, Appearance selector, theme toggle, and Refresh.

Design tokens:

- CSS custom properties for `--ink`, `--muted`, `--line`, `--panel`, `--panel-soft`, `--nav`, `--blue`, `--cyan`, `--green`, `--yellow`, `--red`, `--gray`, `--purple`, shadows, and mode-specific variants.

Modes:

- Standard mode.
- Command Center mode through `body.command-mode`.
- Dark theme through `body.theme-dark`.

Components/patterns:

- Panels: `.panel`, `.table-panel`, `.map-panel`, `.mobile-panel`.
- Buttons: `.primary-button`, `.ghost-button`, `.icon-button`.
- Badges: `.badge.good`, `.badge.warn`, `.badge.bad`, `.badge.info`, `.badge.gray`, `.badge.purple`.
- Metric cards.
- Tables and filter controls.
- Expandable source details.
- QA sections.
- Walkthrough overlay/target highlighting.

Responsive behavior:

- Breakpoints include max-width rules around 1280px, 920px, 840px, and 420px.
- vNext browser evidence includes 390px Pilot Setup checks with no horizontal overflow after fixes.

## Current Demo - Repeated Patterns

- Dense operational panels over marketing-style pages.
- Status badges paired with source/explanation copy.
- Primary actions for Find Coverage, Approve Coverage Plan, Run Demo QA, Preview Template, and Apply Import.
- Copy buttons using shared copy behavior.
- Source details as expandable `details`/`summary` blocks.
- Table filters and compact operational lists.

## Current Demo - Forms And Validation

Confirmed form-like surfaces:

- Pilot request form.
- Pilot Setup CSV/document controls.
- Global search.
- Table filters.
- Demo decision note.

Validation is mostly client-side state/UI. Pilot Setup has the strongest tested validation boundary through `pilotIntakeSafety.js`.

## Founder Decision - 2026-07-13

The static demo remains the visual behavior baseline for operational work. Pilot V1 should prioritize operational action over passive analytics.

The first operational product is Tomorrow Readiness + Coverage Decision System, not a full dispatch platform, ERP, LIMS, field-reporting app, or executive analytics dashboard.

## Pilot V1 Target UI States

Required operational surfaces:

- Tomorrow Readiness board.
- Ready, At Risk, and Not Ready status explanations.
- Critical action queue.
- Find Coverage recommendations.
- Cascading-impact warnings.
- Coverage approval.
- Decision Log and correction history.
- Data-quality reporting.
- Pilot operational-impact snapshot.
- Import preview, validation failures, and import history.

Required state patterns:

- Loading states for imports, readiness calculation, and recalculation.
- Empty states for no upcoming work, no issues, no eligible coverage, and no import history.
- Validation states for missing required fields, duplicate records, sensitive/prohibited columns, malformed files, and stale data.
- Error states for authorization denial, failed import persistence, failed readiness calculation, failed decision write, and failed health dependencies.
- Confirmation states before approval of coverage decisions and significant operational changes.

## Accessibility Evidence

Confirmed:

- `index.html` uses `lang`, viewport, sidebar `aria-label`, input labels, button titles, and some ARIA attributes.
- Browser evidence in vNext docs checked headings, labels, keyboard focus, visible focus, and no horizontal overflow.

Not confirmed:

- Full screen-reader transcript.
- Formal accessibility audit.
- Pilot V1 accessibility target.

## Inconsistencies

- User-facing label "Pilot Materials" and internal/page label "Pilot Readiness Pack" overlap.
- User-facing "Demo QA" and implementation label "Demo Control Center" overlap.
- Settings copy references future integrations/permissions/rates/templates, but no implementation evidence supports them as real product capabilities.

## Proposed Decisions Requiring Approval

- Pilot V1 accessibility target.
- Whether Settings should remain a preview/copy surface or become a real configuration area.
- Whether to formalize a component library during operational vNext architecture selection.
- Whether current demo prototype pages stay visible once Pilot V1 work begins.

## Open Questions

- [OPEN QUESTION - High Impact] Which operational UI framework or component strategy should be selected for Pilot V1?
- [OPEN QUESTION - Medium Impact] What accessibility target should future UI work meet?
- [OPEN QUESTION - Medium Impact] Should the operational app keep dense operational UI as default, or simplify for sales demos?
- [OPEN QUESTION - Medium Impact] Which current demo surfaces should remain visible after Pilot V1 starts?
