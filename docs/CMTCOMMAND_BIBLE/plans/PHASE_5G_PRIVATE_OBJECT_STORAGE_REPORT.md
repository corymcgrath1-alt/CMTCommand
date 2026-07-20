# Phase 5G Private Object Storage Report

## Status

Acceptance-complete for local/test scope on 2026-07-16.

Phase 5G is limited to private assignment media storage and authorized upload/read
foundation. It does not authorize Field Operations FR-1, Field Sessions, reports,
OCR, AI extraction, samples, GPS, Procore, email ingestion, production storage,
production identity, malware scanning, retention, purge, or legal hold.

## Scope Delivered

- Provider-neutral private object-storage interface backed by loopback-only
  S3-compatible local/test storage.
- Exact storage guard for `APP_ENV=test`, `OBJECT_STORAGE_MODE=local-test`,
  loopback endpoint, exact bucket `cmtcommand-media-test`, matching expected
  bucket, non-production credentials, and explicit cleanup authorization.
- Assignment-authorized upload sessions with server-derived organization,
  actor, assignment, bucket, and object key.
- Short-lived presigned direct PUT uploads to private storage.
- Server-side byte-size, SHA-256, media-type, declared-type, and image-dimension
  verification before asset completion.
- Immutable original media assets plus separate preview and thumbnail derivative
  rows and objects.
- Same-assignment duplicate detection and idempotent upload-session behavior.
- Short-lived private read grants through application authorization.
- Transactional audit events for initiation, completion, verification failure,
  duplicate completion, and read-grant issuance.
- PostgreSQL, object-storage, unit, API, and browser acceptance coverage.

## Acceptance Evidence

- Repository preflight: branch `phase-5-tenancy-foundation`, required HEAD
  `2c04d158272ac341023fa6498d5f5b330b2a525f`, upstream
  `origin/phase-5-tenancy-foundation`, ahead/behind `0/0`.
- PostgreSQL image/version: `postgres:16`, live version
  `PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1)`.
- Test database: `cmtcommand_operational_test` on `127.0.0.1:55432`, user
  `cmtcommand_test`.
- Object-store image/version: `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`.
- Object-store endpoint: `http://127.0.0.1:59000`; console bound to
  `127.0.0.1:59001`; browser CORS set with
  `MINIO_API_CORS_ALLOW_ORIGIN=http://127.0.0.1:3100`.
- Test bucket: `cmtcommand-media-test`; bucket policy inspection returned none;
  anonymous object GET and anonymous listing returned HTTP 403; authenticated
  PUT, HEAD, and GET succeeded.
- Migrations: first application succeeded, second application was a safe no-op;
  final ledger contained 13 entries through corrective migration
  `0012_graceful_absorbing_man.sql`.
- Schema inspection confirmed `media_upload_status`, `media_asset_category`,
  `media_asset_status`, `media_derivative_type`, media upload sessions, media
  assets, media derivatives, idempotency uniqueness, one asset per session,
  assignment/hash uniqueness, checksum indexes, assignment media indexes,
  same-organization foreign keys, and append-only triggers on media assets and
  derivatives.
- Corrective migration split storage-key validation into a safe character regex
  plus `char_length(storage_key) <= 512`, avoiding PostgreSQL regex repetition
  counts above 255.
- Fixture seeding was run twice after acceptance data existed; the fingerprint
  remained `e7887c912abbee2dbeba0ecd5cba1e720cbd062f41878ad9fdcc8b7d68701e26`.

## Verification Commands

- `npx vitest run tests/unit/media.storage.test.ts tests/unit/env.server.test.ts tests/unit/auth.permissions.test.ts`: 34 tests passed.
- `npx drizzle-kit check`: passed.
- `npm run db:migrate:test`: first run passed.
- `npm run db:migrate:test`: second run passed as a no-op.
- `npx vitest run --config vitest.integration.config.ts tests/integration/media.integration.test.ts`: 6 tests passed.
- `npm run verify:db`: 5 integration files / 82 tests passed.
- `npx playwright test tests/e2e/media.spec.ts`: 1 browser media test passed.
- `npm run test:e2e`: 16 browser tests passed.
- `npm run verify`: lint, typecheck, 15 unit files / 144 tests, and production build passed.
- `npm run verify:full`: lint, typecheck, 144 unit tests, production build, and 16 browser tests passed.
- `npm run db:generate`: no schema changes after corrective migration.
- `npx drizzle-kit check`: passed after final generation.

## Corrective Changes During Verification

- Replaced filesystem-backed local storage with loopback S3-compatible MinIO
  storage while preserving provider-neutral application interfaces.
- Changed the exact local/test bucket to `cmtcommand-media-test`.
- Added endpoint, access-key, secret-key, and region environment validation.
- Added presigned direct PUT uploads for browser-sized media.
- Added server-side declared media allowlist and image dimension/pixel safety.
- Added the My Assignments upload panel and dispatch read-only media visibility.
- Added object-storage privacy integration coverage.
- Added corrective migration `0012_graceful_absorbing_man.sql` for safe
  PostgreSQL storage-key checks.
- Made an existing audit metadata integration assertion use the inserted row's
  exact time window to avoid default-window ambiguity.
- Made object-storage outages retryable during upload completion instead of
  marking active sessions as failed, and added service/browser regression
  coverage for controlled storage-unavailable behavior.

## Remaining Decisions And Risks

- Production object-storage provider, IAM model, object lock, antivirus/malware
  scanning, retention, legal hold, backup, restore, access monitoring, HEIC,
  video, and cost controls remain unresolved.
- Production identity remains unresolved.
- Field Operations capture/reporting remains gated by later phases and must not
  be represented as implemented from this storage foundation alone.
