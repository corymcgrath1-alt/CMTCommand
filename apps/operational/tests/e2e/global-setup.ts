import { execFileSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDatabasePool, getDatabase } from "../../src/server/db/client";
import { resetLocalTestObjectStorage } from "../../src/server/object-storage/storage";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
} from "../../src/server/db/test-safety";

export default async function globalSetup() {
  process.env.APP_ENV = "test";
  process.env.OBJECT_STORAGE_MODE ??= "local-test";
  process.env.OBJECT_STORAGE_ENDPOINT ??= "http://127.0.0.1:59000";
  process.env.OBJECT_STORAGE_BUCKET ??= "cmtcommand-media-test";
  process.env.OBJECT_STORAGE_EXPECTED_BUCKET ??= "cmtcommand-media-test";
  process.env.OBJECT_STORAGE_REGION ??= "us-east-1";
  process.env.OBJECT_STORAGE_RESET_AUTHORIZATION ??=
    "ALLOW_CMT_TEST_OBJECT_STORAGE_RESET";

  const safety = getAuthorizedTestDatabaseCleanupConfig();
  const db = getDatabase(safety.databaseUrl);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    await db.transaction(async (transaction) => {
      await runAuthorizedTestDatabaseCleanup(
        safety,
        async () => {
          const result = await transaction.execute<{ database_name: string }>(sql`
            select current_database()::text as database_name
          `);
          return result.rows[0]?.database_name;
        },
        async () => {
          await transaction.execute(sql`truncate table
            "media_derivatives",
            "media_assets",
            "media_upload_sessions",
            "audit_events",
            "assignment_events",
            "assignment_technicians",
            "dispatch_assignments",
            "work_orders",
            "technician_office_eligibilities",
            "technicians",
            "projects",
            "service_types",
            "office_assignments",
            "external_identities",
            "organization_memberships",
            "users",
            "offices",
            "organizations"
            restart identity restrict`);
        },
      );
    });
  } finally {
    await closeDatabasePool();
  }
  await resetLocalTestObjectStorage();

  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd run seed:dispatch:dev"]
    : ["run", "seed:dispatch:dev"];
  execFileSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_ENV: "test",
      DATABASE_URL: safety.databaseUrl,
      OBJECT_STORAGE_MODE: process.env.OBJECT_STORAGE_MODE,
      OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT,
      OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET,
      OBJECT_STORAGE_EXPECTED_BUCKET: process.env.OBJECT_STORAGE_EXPECTED_BUCKET,
      OBJECT_STORAGE_ACCESS_KEY_ID:
        process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
      OBJECT_STORAGE_SECRET_ACCESS_KEY:
        process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION,
      OBJECT_STORAGE_RESET_AUTHORIZATION:
        process.env.OBJECT_STORAGE_RESET_AUTHORIZATION,
    },
    stdio: "inherit",
  });
}
