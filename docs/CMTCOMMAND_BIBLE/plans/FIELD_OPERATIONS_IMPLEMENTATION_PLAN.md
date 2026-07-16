# Field Operations Capture And Reporting Implementation Plan

## Document Status

- Status: Active Plan
- Product Position: Future workstream after the founder-approved Tomorrow Readiness and Coverage pilot unless a later founder decision explicitly changes scope
- Current Path: Path B
- Current Phase: FR-0 complete at documentation/architecture level only; P2 durable-record gate complete
- Primary Evidence:
  - [Field Operations Capture And Reporting](../13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md)
  - [Field Operations V1 Specification](../specs/FIELD_OPERATIONS_V1.md)
  - [ADR-006 Field Evidence Is Immutable And AI Extraction Is Advisory](../decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md)
  - [Pilot V1 Implementation Sequence](PILOT_V1_IMPLEMENTATION_SEQUENCE.md)
  - [Phase 5 Tenancy Foundation Report](PHASE_5_TENANCY_FOUNDATION_REPORT.md)
  - [Phase 5D Identity And RBAC Report](PHASE_5D_IDENTITY_RBAC_REPORT.md)
  - [Phase 5E Durable Operational Records Report](PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md)
- Last Reviewed: 2026-07-16

## Purpose

Sequence Field Operations without bypassing CMTCommand's existing operational foundation. This is a dependency and acceptance plan, not a calendar estimate.

## Current Result

FR-0 is complete only in the following sense:

- Product problem and workstream position are documented.
- Field-reporting domain, states, security boundaries, target API contracts, provider-neutral ports, and acceptance criteria are documented.
- Evidence immutability, advisory AI, human review, report versioning, and manual fallback are recorded in ADR-006.
- The current repository prerequisite gap is explicit.
- Phase 5E satisfies P2 with durable Project, Work Order, Assignment, Service
  Type, Technician, primary/support relationship, and assignment-event records.

FR-0 did not add runtime field-reporting behavior, schemas, migrations, routes, providers, UI, extraction, exports, or integrations.

## Hard Prerequisite Gate Before FR-1

The following gates must be implemented and verified in the normal Operational vNext phase order before FR-1 begins:

| Gate | Required capability | Current status | Exit evidence |
| --- | --- | --- | --- |
| P0 | Persistent organization/office tenancy and scoped queries. | Implemented local foundation with migration and isolation coverage; deployment/CI evidence remains a separate release gate. | Migration, isolation tests, stable verification. |
| P1 | Authenticated identity, internal users, organization memberships, office access assignments, and server-enforced RBAC. | Local foundation implemented and tested in Phase 5D; production provider selection remains before pilot use. | Migrations, policy tests, denied cases, authenticated request context, production provider verification. |
| P2 | Durable Project, Work Order, Assignment, Service Type, and Technician records with tenant/office ownership. | **Implemented and verified for the bounded local/test gate.** Phase 5E includes durable service types, primary/support technician relationships, assignment lifecycle/events, own-assignment access, protected APIs/UI, and tenant/isolation tests. | Migrations, source-ID model, PostgreSQL relationship/transition tests, protected API and Playwright workflow evidence. |
| P3 | General append-only audit-event persistence linked to authenticated actor and request context. | Missing. | Schema, service, allowed/denied action tests. |
| P4 | Private object-storage decision and provider-neutral authorized upload/read/delete-under-policy interface. | Missing. | Threat model, adapter contract, size/content validation, idempotency and cross-tenant tests. |
| P5 | Report/template, retention, technical-review, and concrete field requirements approved for the pilot organization. | Missing product decisions. | Versioned configuration and acceptance fixtures. |

Stop if any persistent field record can be created without trusted actor, organization, office, assignment, and audit context.

## Next Executable Gate

Phase 5D implements the local P1 data and authorization foundation without
selecting a production provider. Phase 5E completes the bounded durable-record
P2 gate. P1 is not pilot-complete until the production provider is selected and
verified; P3 through P5 remain unsatisfied. The next Field Operations work still
must not be evidence tables or UI.

Do not begin with evidence tables, upload routes, or `My Day` screens.

## FR-0 - Product And Architecture Definition

- Status: Complete for documentation only, 2026-07-15.
- Objective: Define the workstream without changing the current pilot or simulating persistence.
- In scope: Bible chapter, specification, ADR, staged plan, state machines, API contracts, provider ports, security/privacy boundaries, risks, and prerequisite assessment.
- Out of scope: Runtime product behavior and infrastructure providers.
- Verification: Markdown link validation, diff hygiene, root and operational stable verifiers.
- Exit: This document set is internally linked and Path B is explicit.

## FR-1 - Concrete Inspection Vertical Slice

- Status: Not Started / Blocked by P1-P5.
- Objective: One persistent concrete-placement assignment-to-reviewed-report workflow.
- In scope:
  - Technician `My Day`, assignment, capture, report, samples, and review surfaces.
  - Field sessions and deterministic state transitions.
  - Private original evidence, image previews/thumbnails, hash, upload status, retry/idempotency.
  - Manual concrete values and versioned report requirements.
  - Provider-neutral truck-ticket extraction plus deterministic fake adapter.
  - Suggestion accept/edit/reject with provenance.
  - Technician attestation and configured technical review.
  - Immutable report version, evidence manifest, and structured internal export.
  - Cylinder/sample creation through laboratory receipt status.
  - Dispatcher exception projection and deterministic operational completion.
  - Audit events for every material action.
- Explicitly out of scope: Production Procore/email, plan-location automation, full offline engine, additional report types, full LIMS, autonomous approval.
- Entry: P1-P5 complete and verified.
- Exit: The 21-step acceptance scenario passes with allowed/denied tenant and role cases.
- Required verification:
  - Unit tests for all state machines, requirement resolution, and suggestion review.
  - Database migration, constraint, tenant isolation, transaction, idempotency, versioning, and audit tests.
  - Media tests including >2.5 MB image, disguised media, duplicate retry, original/derivative separation, and private access.
  - Authorization tests for technician, dispatcher, reviewer, admin, and lab receiver.
  - No-provider manual workflow.
  - Mobile browser validation including 390px and interruption/failure states.
  - Existing root, tenancy, and operational checks.

## FR-2 - Offline Resilience And Advanced Media Capture

- Status: Deferred / Not Started.
- Objective: Improve job-site continuity after FR-1 proves the connected workflow.
- Candidate scope:
  - Durable local draft queue with explicit local/queued/uploading/synchronized/failed states.
  - Interrupted/resumable upload support where selected storage permits it.
  - Conflict and duplicate prevention across reconnect/retry.
  - Safer voice/video capture, duration limits, and processing recovery.
  - Unsynchronized-work warnings and session recovery.
- Excludes: Background location, unlimited video, hidden synchronization, native apps unless separately approved.
- Entry: FR-1 production-like pilot evidence identifies real connectivity failures.
- Exit: Offline/reconnect scenarios are deterministic and never show unconfirmed submission.

## FR-3 - Additional Inspection Templates

- Status: Deferred / Not Started.
- Objective: Generalize the proven report-template and evidence model.
- Candidate scope:
  - Additional concrete variants, soils/compaction, masonry, structural steel, fireproofing, or other inspection types selected from customer evidence.
  - Versioned requirement configurations, units, validation, evidence, and review policies.
- Entry: FR-1 template resolver and version model are stable; domain owners approve each template.
- Exit: Each template has fixtures, required-field tests, review rules, and export acceptance.
- Stop: Do not represent engineering requirements without qualified domain approval.

## FR-4 - Email And Procore Adapters

- Status: Deferred / Not Started.
- Objective: Add confirmed external exchange without coupling domain tables to providers.
- Candidate email scope:
  - Controlled inbound addresses, source authentication/scoring, original-message preservation, attachment hash/quarantine, duplicate detection, assignment suggestion, human confirmation.
- Candidate Procore scope:
  - Project/company/user/location/drawing mappings, photo/report/attachment synchronization, webhooks, retries, sync status, and version receipts based on then-current official API documentation.
- Entry: Approved internal version/export path, credential management, adapter policy, provider account, threat model, and integration test environment.
- Exit: Idempotent synchronization proves exact-version transfer and confirmed success/failure states.
- Stop: Never infer external API behavior or auto-finalize from inbound content.

## FR-5 - Plan-Location Intelligence

- Status: Deferred / Not Started.
- Objective: Suggest evidence/report association to controlled project plan locations.
- Candidate scope:
  - Plan document, revision, sheet, named location, and optional user-selected point.
  - Suggestions based on explicit project, device event, plan context, drawing pins, photo content, and prior mappings.
  - Confidence, evidence, revision, and human confirmation.
- Entry: Authoritative plan/revision control and location privacy policy are implemented.
- Exit: No suggestion silently replaces a human selection or refers to an unspecified revision.

## FR-6 - Advanced Operational Analytics

- Status: Deferred / Not Started.
- Objective: Measure field-report flow and exceptions without creating employee surveillance.
- Candidate scope:
  - Assignment/report cycle states, missing-information patterns, sample-pickup exceptions, extraction quality, rework, and integration reliability.
  - Aggregation and minimization rules that avoid individual productivity scoring from passive location/activity.
- Entry: Sufficient verified data, approved metric definitions, retention policy, and bias/privacy review.
- Exit: Metrics are explainable, source-backed, tenant-safe, and do not claim engineering quality from operational proxies.

## Cross-Phase Architecture Rules

- Preserve the root static demo.
- Do not change the founder-approved initial pilot without an explicit founder decision.
- Keep Tomorrow Readiness, field-report status, operational completion, and engineering acceptance conceptually distinct.
- Use authenticated server context and scoped repositories for every protected read/write.
- Keep originals immutable and private; derivatives are separate.
- Keep AI advisory and manual operation available.
- Keep provider SDKs behind server-only adapters.
- Use explicit state transitions and optimistic concurrency.
- Use immutable report versions and append-only audit/sample/review history.
- Do not use browser local storage as the production source of truth.
- Do not add distributed queues until measured execution/retry needs justify them.

## FR-1 Acceptance Scenario Tracking

All 21 scenario steps are currently Blocked because FR-1 runtime is not implemented. Documentation is Complete for the design of each step, but design completion is not product completion.

| Steps | Current result | Unblocking phase |
| --- | --- | --- |
| 1-3 Assignment, My Day, session start | Blocked | P1-P3, FR-1 |
| 4-5 Large ticket photo, original and preview | Blocked | P4, FR-1 |
| 6-8 Extraction and human suggestion review | Blocked | FR-1 |
| 9-10 Manual values and sample set | Blocked | P2-P3, P5, FR-1 |
| 11 Dispatcher pickup visibility | Blocked | FR-1 |
| 12 Additional media/note | Blocked | P4, FR-1 |
| 13-15 Missing fields, resolution, attestation | Blocked | P1, P5, FR-1 |
| 16-18 Review, immutable version, dispatch status | Blocked | P1-P3, FR-1 |
| 19 Export | Blocked | P5, FR-1 |
| 20 Audit history | Blocked | P3, FR-1 |
| 21 No AI submission without review | Architecture rule complete; runtime proof blocked | P1, FR-1 |

## Decision Gates

- Founder/product gate: confirm workstream position and pilot timing.
- Security gate: auth provider/session model, RBAC, storage threat model, retention/legal hold.
- Domain gate: concrete fields, units, ranges, technical-review and attestation rules.
- Operations gate: storage/media limits, derivative/transcription costs, backup/recovery, observability.
- Integration gate: official provider capabilities and customer source-of-truth/writeback policy.
- Release gate: full 21-step scenario plus denied cases and failure recovery.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Field reporting displaces the approved readiness pilot. | Keep it a future workstream until explicit scope decision. |
| Domain records precede trusted identity and assignment ownership. | Enforce P1-P3 gate. |
| Large media creates public exposure or uncontrolled cost. | Private storage, configured limits, short-lived grants, derivatives, retention decisions, cost monitoring. |
| AI suggestions become de facto facts. | Separate suggestion/report models, explicit review actions, attestation/approval permissions. |
| Amendments erase professional history. | Immutable versions and append-only review/audit records. |
| Offline retry duplicates evidence or submissions. | Stable idempotency and confirmed server state. |
| Location becomes surveillance. | Event-based optional capture; no background tracking or productivity scoring. |
| Integrations silently drift from internal report state. | Exact-version mapping, idempotency, confirmation receipts, visible failures. |

## Completion Rule

Do not mark FR-1 or any later phase complete from documentation, schema presence, placeholder UI, or a happy-path demo alone. Completion requires the phase exit criteria and executed verification evidence.
