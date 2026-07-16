# Field Operations Capture And Reporting

## Document Status

- Status: Draft Architecture; Field Operations Runtime Not Implemented
- Scope Label: Future Workstream
- Primary Evidence:
  - Field Operations Capture & Report Intelligence workstream brief, 2026-07-15
  - [Pilot V1 Tomorrow Readiness And Coverage](specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md)
  - [System Architecture](04_SYSTEM_ARCHITECTURE.md)
  - [Data Model And Integrations](05_DATA_MODEL_AND_INTEGRATIONS.md)
  - [Security Privacy And Permissions](09_SECURITY_PRIVACY_AND_PERMISSIONS.md)
  - [ADR-004 Tenancy Authorization And Audit Model](decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md)
  - [ADR-006 Field Evidence Is Immutable And AI Extraction Is Advisory](decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md)
  - [Field Operations V1 Specification](specs/FIELD_OPERATIONS_V1.md)
  - [Field Operations Implementation Plan](plans/FIELD_OPERATIONS_IMPLEMENTATION_PLAN.md)
  - [Phase 5E Durable Operational Records Report](plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md)
- Last Reviewed: 2026-07-16

## Product Position

Field Operations Capture & Report Intelligence is a future CMTCommand workstream that connects a dispatch assignment to field evidence, human-reviewed reporting, sample handoff, and an exportable report package.

It does not change the founder-approved 90-day, single-office Tomorrow Readiness and Coverage pilot. Until an explicit founder decision changes that scope, Field Operations is positioned as the next major workstream after the initial operational wedge and may begin only after its prerequisite identity, authorization, assignment, audit, and storage foundations are complete.

The root static application remains the trusted demo and must not be used to simulate production field-report persistence.

## Current Prerequisite Result

The 2026-07-15 discovery gate selected Path B.

Confirmed foundations:

- Bounded Next.js Operational vNext app under `apps/operational/`.
- PostgreSQL/Drizzle connection and migration tooling.
- Persistent `organizations` and `offices` with scoped office repository functions.
- Provider-neutral users, memberships, office access, and server-enforced local
  identity/RBAC foundations.
- Durable organization/office-owned `projects`, `work_orders`, `technicians`,
  and `dispatch_assignments`, with separate source IDs, scoped services, role
  checks, composite relationship constraints, and local PostgreSQL tests.
- Zod, Vitest, Playwright, health routes, and a PostgreSQL integration-test lane.

Missing foundations that block the concrete-inspection vertical slice:

- A production identity provider and pilot-ready authentication verification.
- Completion of P2, including a durable Service Type record and any approved
  remaining assignment/import-boundary decisions.
- General audit-event persistence.
- A private object-storage abstraction and authorized upload lifecycle.
- A protected server-side product API pattern proven with authenticated tenant context.

Phase 5E records are shared prerequisites, not Field Operations behavior. No
field-reporting runtime, schema, route, upload, extraction, UI, or browser-local
substitute is implemented.

## Product Problem

Field technicians often work through slow legacy reporting systems, small attachment limits, manual photo cropping, repeated ticket transcription, fragmented notes, disconnected sample tracking, and late discovery of missing information. Dispatch and reviewers lack a reliable view of whether the assignment, evidence, report, and samples are operationally complete.

The product must reduce that friction without weakening professional accountability, evidence integrity, tenant isolation, or human judgment.

## Product Thesis

CMTCommand should create one continuous operational record:

```text
Dispatch assignment
-> field session
-> immutable evidence
-> advisory extraction
-> human-reviewed report
-> immutable report version
-> sample handoff
-> internal export or confirmed external synchronization
```

The system is an evidence-to-reviewed-report orchestrator, not merely a form builder. Manual entry remains available when extraction, connectivity, location, media processing, or external integrations are unavailable.

## User Roles

| Role | Primary responsibilities | Boundary |
| --- | --- | --- |
| Field Technician | View own assignments, start assigned sessions, capture evidence, enter results, review suggestions, attest, and submit. | May not approve for another technician or bypass required technical review. |
| Dispatcher / Operations Manager | Monitor assignment, session, report, and sample exceptions; coordinate pickup; reassign within policy. | May not attest for the technician or perform technical approval unless separately authorized. |
| Technical Reviewer | Review report values, evidence, contradictions, narrative, and attestation; approve, return, reopen, or require amendment. | Must not convert unreviewed AI suggestions into facts. |
| Organization Admin | Manage templates, permissions, retention settings, and integrations after those capabilities are approved. | No cross-organization access. |
| Laboratory Receiver | Confirm sample receipt and append sample-status events where authorized. | Does not approve the field report by default. |

Every capability must be enforced server-side from authenticated membership, role, organization, office, and resource facts. UI visibility is not authorization.

## Field-Session Lifecycle

Target session states:

```text
not_started -> active -> paused -> active
active | paused -> capture_complete -> closed
```

- A session belongs to one organization, office, assignment, and technician.
- Starting a session records an explicit event time; optional arrival/location capture is separate.
- `capture_complete` means field capture has ended, not that the report is approved.
- Closing a session must not imply engineering acceptance or external submission.
- Invalid transitions fail without partially changing related report or sample state.

## Evidence Model

An `EvidenceAsset` is the immutable source record for a captured or uploaded file. It retains:

- Organization, office, assignment, field session, project, and uploading user.
- Evidence category.
- Original filename, detected media type, byte size, capture/upload time, and SHA-256 hash.
- Private storage key and retention state.
- Processing history and optional location metadata with source, accuracy, permission state, and capture time.
- Original metadata only where legally appropriate and necessary.

An `EvidenceDerivative` is a separately stored thumbnail, normalized image, preview, audio/video derivative, or transcoded file. It always references its original asset and records processor/version information.

Rules:

- Do not overwrite an original with a compressed or normalized derivative.
- Validate actual media type rather than trusting filename extension.
- Use configurable size limits; normal phone images larger than 2.5 MB must have a supported path.
- Store media privately and provide short-lived authorized access, not permanent public URLs.
- Use hash plus assignment context and idempotency keys for deterministic duplicate/retry behavior.
- Retention-policy deletion is an audited lifecycle action, not silent mutation.

## Human Review And AI Boundary

Extraction processors may propose truck-ticket values, transcripts, classifications, summaries, missing fields, contradictions, and locations. They may not attest, approve, finalize, or submit a report.

Every suggestion retains:

- Raw and normalized values.
- Field key.
- Confidence or confidence class.
- Source evidence and source region/page/frame/time range when available.
- Processor name/version and processing time.
- Validation result and review status.

An extraction result becomes a report value only through an authorized human action. Accepted, human-edited, rejected, conflicting, and unresolved suggestions remain distinguishable. The original suggestion is preserved after review.

No-provider mode is required: uploads, manual data entry, review, attestation, and submission continue without production AI credentials. Automated tests use deterministic fixtures or fake adapters and never call production AI services.

## Report Versioning

The editable `ReportDraft` is mutable within policy. Submission or approval creates an immutable `ReportVersion` inside the same transaction as the state transition.

Each version includes:

- Version number and template version.
- Structured field snapshot.
- Narrative snapshot.
- Evidence manifest.
- Human attestation and review actions.
- Creator, creation time, and approval context.
- Amendment reason and prior-version reference where applicable.

Amendments create later versions. They do not overwrite or delete previously approved versions. Draft, technician-reviewed, technically approved, exported, and externally submitted states must remain visibly distinct.

## Concrete-Placement Initial Slice

The first future vertical slice begins with an existing authorized assignment and ends with a reviewed internal report package plus dispatcher-visible sample status.

It covers:

- Mobile `My Day` assignment access.
- Field-session start and event-based optional location.
- General, truck-ticket, test-result, and observation photos.
- Text note, short voice note, optional short video summary, and manual-entry fallback.
- Manual concrete test values.
- Advisory truck-ticket extraction.
- Required-field, contradiction, and low-confidence review.
- Technician attestation and optional technical review.
- Cylinder/sample-set creation, pickup, transit, and laboratory receipt visibility.
- Immutable report version plus structured/evidence-manifest export.

Required fields are resolved deterministically from organization, office, service type, project, client, and report-template configuration. They are not all universal.

## Sample And Cylinder Workflow

Target sample states:

```text
created -> initial_curing -> awaiting_pickup -> in_transit -> received_by_lab -> closed
                                  \-> exception <-/
```

Sample status changes are append-only events that record actor, time, previous state, resulting state, assignment, report, and safe remarks. Dispatch must be able to see whether samples exist, remain on site, need pickup, are overdue, are in transit, were received, or have an exception.

This workflow establishes the field-to-laboratory handoff. It does not implement a full laboratory information-management system.

## Location And Privacy Policy

- No continuous background location tracking.
- No productivity scoring from passive location history.
- Location capture is optional, explicit, event-based, and scoped to an assignment action.
- Denial or unavailability never blocks report completion.
- Store permission state, source, reported accuracy, and capture time.
- Allow manual correction and a plain-language placement description.
- Do not present low-accuracy or inferred location as exact.
- Future plan-location suggestions require a specific plan revision, provenance, confidence, and human confirmation.

## Assignment And Operational Completion

Field-reporting status is separate from Tomorrow Readiness status. It may be surfaced beside dispatch work but must not overload or redefine the Tomorrow Readiness board.

For the concrete slice, `operationally_complete` is true only when all configured conditions are satisfied:

- Required session information is complete.
- Required evidence is present or an authorized exception is recorded.
- Technician review and attestation are complete.
- Required technical review is complete.
- The approved report package is available or exported according to organization policy.
- Sample disposition is recorded when samples were created.

Operational completion is not engineering acceptance.

## External-System Boundary

Customer systems remain authoritative for official source assignments, project records, client configuration, and downstream systems unless a later integration contract explicitly changes that boundary. CMTCommand is authoritative for its field sessions, evidence manifests, extraction suggestions, review actions, internal report versions, sample-status events, and synchronization history.

External integrations use provider adapters and mapping records. Core tables must not scatter provider-specific identifiers. Every outbound transfer is idempotent, references the exact approved report version, records synchronization state, and is not marked successful without provider confirmation.

Production email ingestion and Procore synchronization are deferred. Future inbound email must preserve the source message, hash/quarantine attachments, avoid duplicates, suggest rather than assume destination, and require human confirmation when uncertain.

## Provider-Neutral Architecture Boundaries

Future implementation should define ports for:

- Private object storage and short-lived authorized download/upload grants.
- Media inspection and derivative generation.
- Extraction/transcription processors.
- Report export.
- External-system synchronization.
- Optional job execution after measured need.

Domain services depend on these ports, not vendor SDKs. Provider clients must be initialized lazily inside server-only modules so Next.js builds do not require runtime credentials.

## Security And Audit

Every field-owned record must carry organization scope and office scope where applicable. Browser-supplied organization IDs are never trusted authorization facts. Services must derive scope from authenticated server context and apply it again in data-access predicates.

Material actions produce safe audit events, including session start/complete, evidence upload/failure/quarantine, extraction completion, suggestion review, report submission/approval/reopen/amend/export, sample creation/state change, location capture, and integration attempts.

General-purpose logs may contain safe identifiers and error categories, but not media contents, full transcripts, signed URLs, secrets, or unbounded field narratives.

## Offline And Failure Behavior

The future field UI must distinguish local, queued, uploading, synchronized, and failed state. Stable client-generated idempotency keys prevent duplicate submissions. A report is not shown as submitted until the server confirms it.

Failure isolation rules:

- Failed transcription does not destroy source media.
- Failed derivative generation does not destroy the original.
- Failed extraction does not block manual report entry.
- Failed export does not invalidate an approved version.
- Failed external synchronization does not claim success.
- Unsynchronized work produces an explicit warning before logout or destructive action.

## Deferred Capabilities

- Full offline synchronization engine and native mobile apps.
- Continuous/background GPS and employee surveillance.
- Automatic project or plan-location confirmation.
- Computer-vision engineering acceptance or autonomous professional judgment.
- Autonomous report submission.
- Production email and Procore adapters.
- Full LIMS, billing, payroll, CRM, and customer portal replacement.
- Unlimited or real-time video processing.
- Additional CMT and special-inspection report types.
- Automatic deletion of original evidence.

## Risks

- Professional/licensure rules may require jurisdiction- and firm-specific attestation and review behavior.
- Evidence retention, legal hold, deletion, and metadata policies are unresolved.
- Media storage, derivative, egress, and transcription costs may be material.
- Job-site connectivity and browser capture behavior vary by device.
- Ticket layouts and handwriting produce extraction uncertainty.
- Location and plan data can be misunderstood as exact without careful confidence language.
- External reporting systems may not support lossless versioned synchronization.
- Field adoption may fail if capture requires excessive typing or unclear upload state.

## Open Questions

- [OPEN QUESTION - High Impact] Is Field Operations the next major workstream after Pilot V1, or a later controlled extension after additional pilot learning?
- [OPEN QUESTION - High Impact] Which authenticated roles may attest, technically approve, reopen, amend, and void reports?
- [OPEN QUESTION - High Impact] What evidence, report, transcript, and location retention/deletion periods apply?
- [OPEN QUESTION - High Impact] What private object-storage and malware/media-inspection providers meet pilot requirements?
- [OPEN QUESTION - High Impact] What maximum image, voice, and video sizes/durations are operationally and financially acceptable?
- [OPEN QUESTION - High Impact] What concrete-report fields and technical-review rules are mandatory by organization/client/jurisdiction?
- [OPEN QUESTION - Medium Impact] What minimum offline behavior is required for the first field pilot?
- [OPEN QUESTION - Medium Impact] Which internal PDF/export format is approved before external adapters exist?
- [OPEN QUESTION - Medium Impact] Which plan-document revision system is authoritative before plan-location suggestions are enabled?
