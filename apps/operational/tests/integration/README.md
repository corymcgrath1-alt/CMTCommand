# Operational Integration Tests

The Phase 5 integration suite verifies the organization/office migration,
constraints, error mapping, and tenant-isolation behavior against a disposable
PostgreSQL database.

Required environment:

```text
APP_ENV=test
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/cmtcommand_operational_test
TEST_DATABASE_EXPECTED_NAME=cmtcommand_operational_test
TEST_DATABASE_EXPECTED_HOST=localhost
TEST_DATABASE_RESET_AUTHORIZATION=ALLOW_CMT_TEST_DATABASE_RESET
```

The database name and host must match the URL exactly. Only the repository-owned
database identity `cmtcommand_operational_test` on an explicitly declared
loopback host is accepted. A database name that merely contains `test` is not
sufficient authorization.

Before every destructive cleanup, the suite reads PostgreSQL's live
`current_database()` value inside the same transaction. Cleanup proceeds only
when it matches the authorized URL identity. The cleanup statement explicitly
enumerates all fifteen tables in dependency-first order, beginning with
`audit_events`, assignment history/relationships, operational records, then
identity/office relationships, users, offices, and organizations. Keeping the
complete dependency-first list in one
`TRUNCATE ... RESTRICT` statement makes cleanup readable while ensuring that a
new dependent table fails visibly until the cleanup contract is intentionally
updated; the suite never falls back to cascade deletion.

Run the database gate from `apps/operational/`:

```powershell
npm run verify:db
```

Never point this suite at a shared, staging, pilot, or production database.
