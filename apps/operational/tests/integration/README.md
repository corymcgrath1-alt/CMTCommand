# Operational Integration Tests

The Phase 5 integration suite verifies the organization/office migration,
constraints, error mapping, tenant-isolation behavior, audit persistence, and
the Phase 5G media-storage database/service boundary against a disposable
PostgreSQL database.

Required environment:

```text
APP_ENV=test
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/cmtcommand_operational_test
TEST_DATABASE_EXPECTED_NAME=cmtcommand_operational_test
TEST_DATABASE_EXPECTED_HOST=localhost
TEST_DATABASE_RESET_AUTHORIZATION=ALLOW_CMT_TEST_DATABASE_RESET
OBJECT_STORAGE_MODE=local-test
OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:59000
OBJECT_STORAGE_BUCKET=cmtcommand-media-test
OBJECT_STORAGE_EXPECTED_BUCKET=cmtcommand-media-test
OBJECT_STORAGE_ACCESS_KEY_ID=<non-production local access key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<non-production local secret key>
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_RESET_AUTHORIZATION=ALLOW_CMT_TEST_OBJECT_STORAGE_RESET
```

The database name and host must match the URL exactly. Only the repository-owned
database identity `cmtcommand_operational_test` on an explicitly declared
loopback host is accepted. A database name that merely contains `test` is not
sufficient authorization.

Before every destructive cleanup, the suite reads PostgreSQL's live
`current_database()` value inside the same transaction. Cleanup proceeds only
when it matches the authorized URL identity. The cleanup statement explicitly
enumerates the current media, audit, assignment history/relationships,
operational records, identity/office relationships, users, offices, and
organizations in dependency-first order. Keeping the complete dependency-first
list in one `TRUNCATE ... RESTRICT` statement makes cleanup readable while
ensuring that a new dependent table fails visibly until the cleanup contract is
intentionally updated; the suite never falls back to cascade deletion.

Media-object cleanup is separately guarded by exact local/test bucket, loopback
endpoint, non-production credentials, and `ALLOW_CMT_TEST_OBJECT_STORAGE_RESET`;
it is never authorized by database cleanup alone. Browser E2E runs require the
local S3-compatible server to allow the Playwright origin, for example MinIO
with `MINIO_API_CORS_ALLOW_ORIGIN=http://127.0.0.1:3100`.

Run the database gate from `apps/operational/`:

```powershell
npm run verify:db
```

Never point this suite at a shared, staging, pilot, or production database.
