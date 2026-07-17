# Data Lifecycle And Retention Policy Draft

## Document Status

- Status: Draft requiring founder, legal, insurance, accreditation, and customer approval.
- Date: 2026-07-16
- Scope: Production and pilot data lifecycle framework for Operational vNext and future Field Operations.
- Runtime impact: Documentation only.
- This document does not create final retention periods.
- Founder decision source: CMTCommand Phase 5H Founder Decisions, 2026-07-16.
- Related documents:
  - [Phase 5H Production Governance And Pilot Readiness](../plans/PHASE_5H_PRODUCTION_GOVERNANCE_AND_PILOT_READINESS.md)
  - [Security Privacy And Permissions](../09_SECURITY_PRIVACY_AND_PERMISSIONS.md)
  - [Production Threat Model](../security/PRODUCTION_THREAT_MODEL.md)

## Policy Principles

1. Customer and legal requirements control final retention periods.
2. CMTCommand should minimize personal and sensitive data.
3. Original evidence is immutable while retained.
4. Deletion is a governed lifecycle action, not an ordinary edit.
5. Legal hold overrides ordinary deletion and backup expiration.
6. Audit events retain accountability metadata but exclude secrets, signed URLs,
   file bytes, full transcripts, and report bodies.
7. Continuous employee surveillance is prohibited.
8. Location, if ever approved, must be explicit, optional, event-based, and
   scoped to an assignment action.

## Founder Decisions Recorded

- Continuous employee monitoring is prohibited.
- GPS and location are deferred. No continuous or background location tracking
  is allowed. A later proposal may support optional, explicit, event-based
  assignment location.
- Preserve only metadata required for evidentiary integrity.
- Do not use embedded GPS automatically.
- Strip unnecessary metadata from derivatives.
- Final retention periods require customer and legal review. Until approved, no
  customer pilot begins.
- Internal-alpha data will use a separately documented temporary retention
  policy.
- No ordinary user deletion is available.
- Controlled purge requires organization-admin authorization plus a designated
  CMTCommand production operator and a durable audit event.
- The architecture must support a future legal-hold state. A formal legal-hold
  workflow is not required for the internal alpha but must be resolved before a
  customer contract requires it.

## Draft Lifecycle Matrix

| Data class | Examples | Draft retention posture | Deletion or purge posture | Approval required |
| --- | --- | --- | --- | --- |
| Organizations and offices | Customer organization, participating office, status. | Retain while customer is active and during contractual wind-down. | Disable/archive before purge; preserve audit references. | Founder, customer contract. |
| Users and identities | Internal user record, provider subject, email, status. | Retain active and historical identity facts needed for audit. | Deprovision access immediately; purge or anonymize contact fields only under approved policy. | Founder, legal/privacy. |
| Memberships and office access | Role, status, office scope, version. | Retain history needed to explain access and audit. | No ordinary deletion while audit references exist. | Founder, legal/privacy. |
| Projects, work orders, service types | Operational source records and snapshots. | Retain for pilot duration plus approved post-pilot period. | Archive or controlled purge after export/termination and legal-hold check. | Customer, legal, insurance/accreditation where applicable. |
| Dispatch assignments and assignment history | Assignment, technician links, lifecycle events. | Retain as operational history tied to field evidence and reports. | Controlled purge only after dependent media/report retention permits. | Customer, legal, insurance/accreditation. |
| Original media assets | JPEG, PNG, and WebP originals for alpha/initial pilot; PDFs and other formats deferred unless later approved. | Retain immutable originals for approved evidence period; final customer duration not set. | Delete bytes only through audited lifecycle workflow with tombstone and legal-hold check. | Customer, legal, insurance/accreditation. |
| Media derivatives | Preview, thumbnail, normalized view. | Retain while original is retained unless regeneration is approved. | Delete/regenerate under policy; do not treat derivative deletion as original deletion. | Founder, customer policy. |
| Upload sessions | Pending/completed/failed upload intent and safe metadata. | Retain briefly after completion/failure for retry, audit, and troubleshooting. | Expired pending sessions may be purged after safe orphan cleanup. | Founder, operations. |
| Failed or orphaned upload objects | Unverified objects, abandoned presigned uploads. | Short operational retention only. | Guarded cleanup after expiry and audit/log review. | Operations/security. |
| Audit events | Actor, category, action, target, request/correlation, safe state. | Retain according to approved audit retention and legal hold. | No ordinary user delete; controlled archive/purge only with legal approval. | Legal/privacy, founder. |
| Field reports | Drafts, immutable versions, attestations, amendments. | Not implemented; future retention depends on report type and customer obligations. | Approved versions are immutable while retained; amendments append versions. | Customer, legal, accreditation. |
| Report exports | Internal package, PDF if approved, evidence manifest. | Retain with report version or source-of-truth policy. | Purge/export handoff per customer contract. | Customer, legal. |
| Samples and future lab records | Cylinder sets, lab receipt events, test ages. | Not implemented; likely governed by engineering records policy. | Purge only under accredited-record and customer requirements. | Legal, insurance, accreditation, customer. |
| Extraction suggestions | OCR/AI/manual suggestion output and provenance. | Not implemented; retain only if needed for report provenance. | Purge with report/evidence policy; never let AI output become unreviewed fact. | Legal/privacy, customer. |
| Location metadata | Event-based location source, accuracy, timestamp. | Deferred by founder decision. If later approved, retain only with related event/report need. Embedded GPS is not used automatically. | Purge/minimize aggressively unless required for evidence. | Founder, legal/privacy, customer. |
| Application logs | Error categories, request IDs, operational metrics. | Retain short operational window with no secrets or media contents. | Rotate and expire by monitoring policy. | Operations/security. |
| Backups | Database backups, object-storage backups/replicas. | Retain according to RPO/RTO and legal hold. | Expire backups only after hold and contract checks. | Operations, legal/privacy. |
| Customer termination data | Tenant records after contract end. | Retain through export, dispute, and required wind-down window. | Controlled purge with certificate/record of deletion if agreed. | Customer, legal/privacy. |
| Expired pilot data | Pilot fixtures, customer pilot records, evidence. | Retention period must be decided before pilot start. | Export, anonymize, purge, or convert to production contract only by approval. | Founder, customer, legal. |

## Lifecycle States

Recommended states for governed records:

- `active`: available for normal authorized use.
- `archived`: hidden from ordinary workflows but retained.
- `legal_hold`: preserved and excluded from purge.
- `pending_purge`: approved for deletion but awaiting final checks.
- `purged`: bytes or mutable personal fields removed; tombstone/audit retained.
- `exported`: customer handoff completed; retention still follows contract.

## Controlled Deletion Requirements

Before any production purge capability exists:

- Define who may request deletion.
- Define who approves deletion.
- Require organization/customer scope confirmation.
- Check legal hold.
- Check report/evidence dependencies.
- Write audit event before and after lifecycle action.
- Preserve tombstone metadata needed for audit and reconciliation.
- Verify database and object-storage deletion outcomes.
- Define backup expiration handling.

## Open Legal And Customer Inputs

- Final duration for customer pilot data after pilot end.
- Final duration for original media and derivatives.
- Final duration for audit events.
- Whether legal hold is required for pilot.
- Whether customer can request export and purge.
- Whether professional records, insurance, or accreditation rules impose longer
  retention.
- Whether EXIF/GPS metadata may be retained.
- Whether report exports make CMTCommand or the customer system the official
  source of truth.

## Pilot Default Until Approved

Until customer/legal retention is approved, production customer data must not be
stored. Internal alpha data must use the separate temporary retention policy and
should use fictional, anonymized, or non-sensitive evidence unless a
founder-approved exception and legal/privacy review authorize a limited
real-data test.
