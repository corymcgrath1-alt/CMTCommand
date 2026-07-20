# ADR-010 Private Object Storage And Authorized Media Upload Foundation

## Document Status

- Status: Accepted for Phase 5G local/test scope
- Date: 2026-07-16
- Extends: [ADR-006 Field Evidence Is Immutable And AI Extraction Is Advisory](ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md)
- Complements: [ADR-008 Dispatch Assignments Are The Field Operations Handoff](ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md) and [ADR-009 Material Mutations Write Transactional Append-Only Audit Events](ADR-009_MATERIAL_MUTATIONS_WRITE_TRANSACTIONAL_APPEND_ONLY_AUDIT_EVENTS.md)
- Primary evidence:
  - `apps/operational/src/server/object-storage/`
  - `apps/operational/src/server/media/`
  - `apps/operational/src/server/db/schema/media-upload-sessions.ts`
  - `apps/operational/src/server/db/schema/media-assets.ts`
  - `apps/operational/src/server/db/schema/media-derivatives.ts`
  - `apps/operational/tests/integration/media.integration.test.ts`
  - `apps/operational/tests/e2e/media.spec.ts`

## Decision

CMTCommand Operational vNext stores assignment media through a server-owned,
provider-neutral private object-storage boundary. Direct uploads use short-lived
presigned S3-compatible PUT grants created only after assignment authorization. Upload
completion verifies size, SHA-256, and detected media type server-side before
creating immutable original media assets. Preview and thumbnail derivatives are
separate objects and rows.

## Scope

Phase 5G implements local/test storage only. It does not select or configure a
production storage provider, production identity provider, malware scanner,
retention policy, Field Sessions, reports, OCR/AI extraction, samples, Procore,
email ingestion, or Field Sessions/reporting UI.

## Trusted Context And Authorization

Upload initiation and read grants derive organization, office scope, role, and
own-assignment access from the existing server authorization context. Field
technicians may create/read media only for assignments linked to their active
technician relationship. Viewers receive no media permission. Storage bucket,
key, token, and organization identity are never accepted as browser authority.

## Privacy And Audit

Public media responses expose bounded media facts and derivative summaries, not
storage coordinates, signed tokens, original filenames after completion, or
media contents. Media audit events record upload initiation, completion, failure,
and read-grant issuance in the source transaction where applicable. Audit
serializers exclude object coordinates, URLs, tokens, filenames, and content.

## Local/Test Safety

The local/test provider is disabled by default and requires a loopback
S3-compatible endpoint, exact bucket `cmtcommand-media-test`, matching expected
bucket, non-production credentials, and explicit object-storage reset
authorization. The provider is rejected in production runtimes and must not be
treated as a production storage or IAM design.

## Consequences

Positive:

- Assignment media can be tested end-to-end without public buckets.
- Original media facts are immutable and derivatives are independently tracked.
- Duplicate upload attempts can resolve to an existing asset without duplicating
  original media rows.
- Audit history is available without exposing storage internals.

Tradeoffs:

- Production storage, scanning, retention, and IAM remain explicit future work.
- Direct upload completion requires the application server to read and verify
  the object before an asset becomes visible.
- Local/test object cleanup needs its own safety proof in addition to database
  cleanup.
