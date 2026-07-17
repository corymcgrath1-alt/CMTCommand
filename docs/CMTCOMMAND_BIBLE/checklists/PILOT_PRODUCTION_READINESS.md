# Pilot Production Readiness Checklist

## Document Status

- Status: Draft go/no-go checklist for founder approval.
- Date: 2026-07-16
- Scope: Required evidence before pilot-production launch or Field Operations FR-1 authorization.
- Runtime impact: Documentation only.
- Related documents:
  - [Phase 5H Production Governance And Pilot Readiness](../plans/PHASE_5H_PRODUCTION_GOVERNANCE_AND_PILOT_READINESS.md)
  - [Production Threat Model](../security/PRODUCTION_THREAT_MODEL.md)
  - [Data Lifecycle And Retention Draft](../policies/DATA_LIFECYCLE_AND_RETENTION_DRAFT.md)

## Status Legend

- Complete: executed evidence exists and the gate is approved.
- Partial: local/test evidence exists but production or governance evidence is missing.
- Blocked: required decision, provider, policy, runbook, or verification is absent.
- Deferred: intentionally out of current pilot scope.

## Production Go/No-Go Gates

| Gate | Requirement | Evidence | Owner | Status | Blocking |
| --- | --- | --- | --- | --- | --- |
| Identity provider | Managed production identity selected and configured with issuer/audience/signature/expiration verification. | Founder approved managed identity category with invitations, MFA, revocation, stable subject IDs, multi-org membership, emergency recovery, auditability, and migration support; exact vendor absent. | Identity/security | Partial | Blocking |
| Invitations | Invite-only onboarding and acceptance flow approved. | Founder approved managed identity category requiring invitations; no production invitation delivery. | Product/identity | Partial | Blocking |
| MFA and revocation | MFA policy, session revocation, deprovisioning, and emergency recovery defined. | Founder approved provider category requiring MFA/revocation; exact provider and role-specific policy absent. | Identity/security | Partial | Blocking |
| Hosting provider | Managed Next.js production host selected with dev/staging/pilot-production separation. | Founder approved managed Next.js-compatible hosting category; exact provider absent. | Cloud architecture | Partial | Blocking |
| TLS and domains | HTTPS, domain/DNS ownership, certificate process, and preview isolation approved. | No deployment configuration. | Cloud architecture | Blocked | Blocking |
| Secret management | Secrets stored in approved provider/secret manager, rotated, and excluded from client bundle/logs. | Local env validation exists; no production secret manager. | Security/operations | Blocked | Blocking |
| PostgreSQL provider | Managed PostgreSQL provider, region, network restrictions, encryption, roles, pooling, and provider exit approved. | Founder approved managed PostgreSQL category; local/test PostgreSQL verified only; exact provider absent. | Database architecture | Partial | Blocking |
| Database migrations | Production migration role and rollback/recovery procedure documented. | Drizzle migrations exist; production role model absent. | Database/operations | Blocked | Blocking |
| Database recovery | RPO/RTO approved, automated backups configured, restore test executed. | Founder provisionally approved database RPO <= 1 hour and service RTO <= 4 hours pending provider cost; no production backup/restore proof. | Database/operations | Partial | Blocking |
| RLS evaluation | Defense-in-depth RLS decision documented after app authorization remains primary. | Open question in existing docs. | Security/database | Blocked | Blocking |
| Object storage provider | Production private object storage selected with public access blocked and IAM least privilege. | Founder approved managed private object-storage category; local/test MinIO proof only; exact provider absent. | Storage/security | Partial | Blocking |
| Storage privacy | Anonymous read/list denied, no public policy, no permanent URLs, access logs enabled. | Proven for local/test only. | Storage/security | Partial | Blocking |
| Storage lifecycle | Versioning/object lock/lifecycle/egress/provider-exit decisions approved. | No production policy. | Storage/legal/cost | Blocked | Blocking |
| Malware scanning | Scanner, quarantine, scan timing, failure behavior, false-positive handling approved. | Founder requires malware scanning before customer uploads; internal alpha exception requires explicit temporary risk acceptance, image-only formats, private storage, and manual operator review. Phase 5G type validation only. | Security/product | Partial | Blocking for customer uploads |
| File limits | Pilot media types, max size, dimensions, PDFs/HEIC/video/archive/SVG policy approved. | Founder approved JPEG, PNG, and WebP only; HEIC/HEIF, audio, video, SVG, HTML, archive, and executable content deferred/excluded; 25 MB image limit. | Product/security | Partial | Blocking until implemented |
| Retention | Data lifecycle durations approved for media, audit, reports, backups, and pilot termination. | Founder requires customer/legal review before customer pilot and a separate temporary internal-alpha retention policy; no final durations. | Legal/privacy/customer | Blocked | Blocking |
| Legal hold | Hold trigger, authority, workflow, and purge override defined. | Founder requires architecture support for future legal-hold state; formal workflow not required for internal alpha but required when customer contract requires it. | Legal/privacy | Partial | Blocking for customer contracts requiring hold |
| Controlled purge | Deletion request, approval, tombstone, storage deletion, backup expiration procedure approved. | Founder approved no ordinary user deletion and dual authorization by organization admin plus designated CMTCommand production operator with durable audit; no runtime purge. | Legal/privacy/operations | Partial | Blocking until implemented |
| Monitoring | App, database, storage, backup, audit, denial, cross-tenant, capacity, and cost alerts configured. | Founder approved required monitoring categories; no production monitoring implementation. | Reliability/operations | Partial | Blocking |
| Incident response | Severity model, notification owner, evidence preservation, credential compromise, and exposure response runbook approved. | Founder requires written incident-response runbook, severity model, notification owner, credential rotation, evidence preservation, and customer notification path; no runbook yet. | Security/operations | Partial | Blocking |
| Support model | Support hours, escalation path, training, onboarding, offboarding, manual fallback approved. | Founder named Cory as initial CMTCommand product/escalation owner and requires customer organization admin and operational contact; support hours/training still absent. | Product/operations | Partial | Blocking |
| Customer agreement | Customer pilot agreement covers scope, data, retention, support, source of truth, and stop conditions. | Existing 90-day pilot scope only. | Founder/customer/legal | Blocked | Blocking |
| Cost controls | Budget cap, storage/egress/log/scanner alerts, and media-heavy scenario approved. | Formula model exists; founder still must provide monthly caps for internal alpha, one-office customer pilot, and five-office pilot. | Cost/operations | Blocked | Blocking before final provider selection |
| Static demo preservation | Root static verifier passes and root demo remains unchanged. | Existing verifier; must rerun at production gate. | Engineering | Partial | Blocking before release |
| End-to-end verification | Production-like browser/API/database/storage acceptance passes with no test adapters or local-only guards. | Local/test Phase 5G passed only. | QA/engineering | Blocked | Blocking |

## Field Operations FR-1 Gates

| Gate | Requirement | Evidence | Owner | Status | Blocking |
| --- | --- | --- | --- | --- | --- |
| P1 production identity | Production provider and pilot-ready authentication verified. | Phase 5D local/test only. | Identity/security | Blocked | Blocking |
| P2 durable assignment records | Projects, service types, technicians, work orders, assignments, and events implemented. | Phase 5E local/test acceptance complete. | Engineering | Complete for local/test | Non-blocking locally; production gate still applies |
| P3 audit persistence | Transactional append-only audit implemented. | Phase 5F local/test acceptance complete. | Engineering/security | Complete for local/test | Non-blocking locally; retention/SIEM still blocking |
| P4 media storage | Private media upload/read primitives implemented. | Phase 5G local/test acceptance complete. | Engineering/storage | Complete for local/test | Production storage/scanning/retention still blocking |
| P5 report governance | First report type, fields, templates, review, approval, amendments, exports approved. | Founder approved concrete placement first, assigned-technician draft/attestation, technical-review approval, immutable amendments, PDF plus JSON export, AI advisory boundary, and operations-manager non-approval boundary; detailed field/template rules remain absent. | Founder/product/customer | Partial | Blocking |
| Field Operations timing | Record whether Field Operations is in the original pilot, an internal alpha, or a separate customer pilot. | Founder decided Field Operations is excluded from original Tomorrow Readiness and Coverage pilot; internal alpha first, then separately authorized customer pilot. | Founder/product | Complete | Non-blocking for Phase 5I; FR-1 still blocked |
| Report source of truth | Existing customer system versus CMTCommand official destination decided. | Founder decided customer's existing reporting platform remains official during pilot. | Founder/customer | Complete | Non-blocking for Phase 5I |
| Manual fallback | Offline/unavailable/manual process documented for auth, DB, storage, upload, and reports. | Founder decided no workflow may falsely report saved/submitted data and existing customer dispatch/reporting process remains fallback; detailed runbook absent. | Operations/product | Partial | Blocking |
| Training | Technician, dispatcher, reviewer, and admin training approved. | None. | Product/operations | Blocked | Blocking |
| Success metrics | Pilot success and stop conditions approved. | Tomorrow Readiness pilot exists; Field Operations metrics not approved. | Founder/product | Blocked | Blocking |

## Current Gate Result

Pilot-production launch: No-go.

Field Operations FR-1 coding: No-go.

Allowed next step: Phase 5I production-readiness implementation for provider
shortlist comparison, secrets, identity, database, storage, malware scanning,
monitoring, backup/restore, incident response, and governed pilot operations.
Internal Field Operations alpha and Field Operations FR-1 remain blocked until
their specific report, lifecycle, retention, risk-acceptance, and verification
gates are complete.
