# Production Threat Model

## Document Status

- Status: Draft threat model for production-governance review.
- Date: 2026-07-16
- Scope: Pilot-production and Field Operations readiness threats for the
  Operational vNext foundation.
- Runtime impact: Documentation only.
- Founder decision source: CMTCommand Phase 5H Founder Decisions, 2026-07-16.
- Related documents:
  - [Phase 5H Production Governance And Pilot Readiness](../plans/PHASE_5H_PRODUCTION_GOVERNANCE_AND_PILOT_READINESS.md)
  - [Security Privacy And Permissions](../09_SECURITY_PRIVACY_AND_PERMISSIONS.md)
  - [ADR-007 Server-Derived Authorization Scope](../decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md)
  - [ADR-009 Material Mutations Write Transactional Append-Only Audit Events](../decisions/ADR-009_MATERIAL_MUTATIONS_WRITE_TRANSACTIONAL_APPEND_ONLY_AUDIT_EVENTS.md)
  - [ADR-010 Private Object Storage And Authorized Media Upload Foundation](../decisions/ADR-010_PRIVATE_OBJECT_STORAGE_AND_AUTHORIZED_MEDIA_UPLOAD_FOUNDATION.md)

## Summary

The highest production blockers are production identity, production object
storage/IAM, malware scanning, retention/legal hold, backup/recovery,
monitoring/incident response, and pilot operating ownership. Existing local/test
controls are meaningful but not sufficient for production.

Current strong controls:

- Server-derived organization, office, role, and assignment scope.
- Fail-closed production authentication boundary.
- Private local/test object storage with exact guard.
- Immutable original media facts and separate derivative objects.
- Transactional append-only audit events for current material mutations.
- Bounded audit serializers that exclude tokens, credentials, content, and
  signed URLs.

Founder decisions now recorded:

- Option A simplified managed pilot architecture is approved as the category.
- Managed identity, hosting, PostgreSQL, and private object-storage categories
  are approved; exact vendors are deferred to Phase 5I.
- Malware scanning is mandatory before customer uploads.
- Internal alpha may proceed without a commercial scanner only with explicit
  temporary risk acceptance, JPEG/PNG/WebP-only media, private storage, and
  manual operator review.
- Maximum image size is 25 MB for alpha and initial pilot.
- Audio, video, HEIC/HEIF, GPS, and external integrations are deferred.
- Continuous employee monitoring is prohibited.
- Customer pilot requires approved providers, production identity, managed
  PostgreSQL/storage controls, malware scanning, retention/deletion policy,
  backup/restore proof, monitoring, incident response, onboarding/offboarding,
  production-like tests, report rules, customer agreement, fallback, support
  owners, and founder go/no-go approval.

Missing production controls:

- Managed identity provider, MFA, revocation, and invitation workflow.
- Production storage provider, IAM, key management, object lock, and lifecycle.
- Malware scanner and quarantine workflow.
- Retention, legal hold, controlled purge, and backup expiration policy.
- Monitoring, alerting, SIEM/export decision, and incident runbooks.
- Support and offboarding operating procedures.

## Threat Register

| Threat | Asset | Actor | Attack path | Existing control | Residual risk | Required future control | Pilot blocker status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cross-tenant access | Organization records, assignments, media, audit | Authenticated user or attacker | Guess another tenant ID or submit browser organization claim. | Server-derived membership and organization scope; non-leaking not-found/inaccessible responses; composite database constraints. | No production provider/RLS; future domains can regress if not tested. | Production auth verification, tenant isolation tests, RLS evaluation, denial monitoring. | Blocking until production identity is approved. | Security/architecture |
| Cross-office access | Office-scoped assignments, media, audit | Restricted office user | Query another office or use known IDs. | Office scope in authorization context; restricted-scope predicates; same-organization office constraints. | Future report/sample screens may miss office predicates. | Office-scope regression tests for every new protected route; alert on repeated denied probes. | Blocking for FR-1 until tests exist. | Application architecture |
| Stolen session | User account, media, mutations | External attacker or lost device holder | Use stolen cookie/token before expiration. | Development sessions are HttpOnly and bounded; production auth disabled. | Production session model not selected; MFA/revocation missing. | Managed provider with secure cookies, MFA policy, revocation, device/session management. | Blocking for production. | Identity |
| Privilege escalation | Admin functions, report approval, audit | Authenticated lower-privilege user | Forge role/permission client value or exploit stale membership. | Roles/permissions derived server-side; actor revalidated in transactions. | Production admin recovery and emergency access not defined. | Production role management runbook, admin MFA, role-change audit, break-glass policy. | Blocking for production admin use. | Identity/security |
| Malicious file upload | Browser, storage, processors, reviewers | Authorized user or compromised account | Upload malware disguised as evidence. | Size, checksum, declared/detected type, and dimension checks; private storage. Founder requires malware scanning before customer uploads. | No antivirus, quarantine, deep PDF inspection, or active content policy implemented. | Malware scanner, quarantine, scan-failure policy, operator review, active content blocking. | Blocking for customer media; internal alpha requires explicit temporary risk acceptance. | Security/storage |
| Disguised executable | Media verification path | Authorized uploader | Name executable as image/PDF. | Magic-byte detection independent of filename. | Polyglot and embedded payload risk remains. | Malware scanner and content-disarm or restricted type policy. | Blocking for customer uploads. | Security |
| Decompression bomb | Media decoder/processor | Authorized uploader | Upload image/archive/PDF that expands excessively. | Current image dimensions/pixel bounds; archives not accepted as media. | PDFs and future formats need deeper controls. | Decoder sandbox, archive rejection, PDF scanning, resource limits. | Blocking for expanded media types. | Security/storage |
| Storage-key guessing | Private object store | External attacker or tenant user | Guess object path or use leaked key. | No storage key in normal asset/list/audit payloads; private bucket; signed reads. | Production bucket/IAM not configured; signed URL leaks remain possible. | IAM least privilege, no public policy, object-key entropy/prefixing, access logs. | Blocking until production storage approved. | Storage |
| Signed URL leakage | Media objects | User, browser logs, support tools | Copy upload/read URL from network tools or logs. | Short lifetimes; audit serializers exclude signed URLs. | URLs may appear in browser/dev logs; production logging policy missing. | Log redaction, short expiration, referer policy, incident response, support handling. | Blocking for production observability. | Security/operations |
| Replay of upload instructions | Upload session and object | Attacker with upload grant | Reuse presigned PUT or token before expiry. | Upload grant expires; completion verifies checksum and size; one asset per session. | No production WAF/rate limits; no provider event audit. | Short expirations, rate limits, storage access logs, idempotency monitoring. | Non-blocking if production monitoring exists. | Storage/API |
| Duplicate completion | Media asset table | Browser retry or attacker | Complete same session concurrently. | One asset per session, idempotent session completion, duplicate detection. | Future report attachment code may duplicate state. | Concurrency tests for every media consumer. | Non-blocking for current media; blocking for FR-1 until extended. | Application architecture |
| Object overwrite | Original media bytes | Compromised credential or bug | Reuse key or PUT over existing original. | Server-generated keys; immutable DB facts; completion verifies original. | Object store may still allow overwrite; no object lock. | Object lock/versioning decision, IAM deny overwrite where possible, reconciliation job. | Blocking decision for production originals. | Storage |
| Object deletion | Original/derivative bytes | Insider, bug, compromised key | Delete evidence without lifecycle authorization. | No ordinary app delete operation; local cleanup guard test-only. | Production IAM/delete policy not defined. | Delete-under-policy service, object lock/legal hold, restricted IAM, audit tombstones. | Blocking for production media. | Storage/legal |
| Audit tampering | Audit events | Insider or compromised DB role | Update/delete audit rows. | PostgreSQL append-only trigger rejects ordinary update/delete. | Production DB roles and superuser access model not defined. | Least-privilege roles, backup integrity, admin access logging, retention/legal hold. | Blocking for production. | Database/security |
| Insider access | Customer data, media, audit | Internal admin/support | View or export data outside support purpose. | App RBAC; no production access model yet. | Support access and logging not defined. | Support-access policy, just-in-time access, audit, customer notification rules. | Blocking for pilot operations. | Operations/privacy |
| Production-secret leakage | DB, storage, identity | Developer, CI, attacker | Commit `.env`, leak logs, expose client bundle. | `.env.example` blanks; previous scans; server-only adapters. | Production secret manager not selected. | Secret manager, rotation, CI scope, bundle scans, incident runbook. | Blocking for production. | Security/operations |
| Backup exposure | Database and media backups | Insider or external attacker | Access backup copies or restore to unsafe location. | No production backups exist. | Backup encryption/access unknown. | Encrypted backups, restricted restore authority, restore logging, retention alignment. | Blocking for production. | Database/operations |
| Incomplete customer offboarding | Customer records, media, identities | Operations gap | Disable users but leave data/keys/backups active. | No production offboarding process. | Data and accounts may persist beyond contract. | Offboarding checklist, export/purge/legal hold workflow, identity deprovisioning. | Blocking for pilot agreement. | Operations/privacy |
| Accidental retention-policy violation | Media, audit, reports, backups | System or operator | Keep or delete data outside agreed period. | No final retention period selected. | Legal/customer obligations unknown. | Approved retention matrix, deletion authorization, legal hold, backup expiration. | Blocking for customer data. | Legal/privacy |
| External integration compromise | Future Procore/email/report adapters | External provider or compromised token | Provider webhook/API abuse or token leak. | Integrations are deferred. | Future provider behavior unknown. | Threat model per integration, scoped credentials, webhook verification, idempotency. | Deferred until integrations phase. | Integrations/security |
| Denial of service through large uploads | App, DB, storage, scanner, cost | Authorized or automated actor | Upload large or many files. | Phase 5G size limit and validation; founder set 25 MB original image limit for alpha and initial pilot. | Production rate limits, quotas, and scanner limits missing. | Per-user/assignment quotas, WAF/rate limits, cost alerts, queue limits, 25 MB implementation. | Blocking for customer media until implemented and monitored. | Operations/storage |
| Cost abuse | Storage, egress, scanner, logs | Authorized user or attacker | Excessive media upload/read/log generation. | Duplicate detection; bounded media size. | No production cost monitor or quota. | Budget alerts, quotas, media limits, egress monitoring, support escalation. | Blocking for media-heavy pilot. | Cost/operations |
| Mobile device loss | Session, captured field data | Lost/stolen phone | Active session on device or local files accessible. | Server session required; no production offline queue. | Production session revocation and offline policy missing. | MFA/session revocation, device guidance, no sensitive local cache, support playbook. | Blocking for production field use. | Identity/operations |
| Technician uploads wrong project evidence | Evidence integrity, reports | Authorized technician | Upload media to wrong assignment or category. | Uploads tied to authorized assignment and category; duplicate detection by assignment. | Human mistake still possible; no report review workflow yet. | UI confirmation, assignment context, review screen, correction/amendment policy. | Blocking for FR-1 workflow, not for current media foundation. | Product/operations |

## Pilot Blockers

Blocking before any customer production pilot:

- Production identity provider and revocation path.
- Production PostgreSQL provider and recovery proof.
- Production object storage provider/IAM and private bucket proof.
- Secret management and rotation.
- Malware scanning or explicitly approved internal-alpha exception.
- Retention, deletion, legal hold, and backup expiration policy.
- Monitoring, alerting, incident response, and support ownership.
- Customer onboarding/offboarding and pilot agreement.

Blocking before Field Operations FR-1:

- Report/template governance.
- Technical review and attestation authority.
- Media lifecycle and malware decisions.
- Field Operations pilot timing decision.
- Report source-of-truth and export boundary.
