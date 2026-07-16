import { execFileSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDatabasePool, getDatabase } from "../../src/server/db/client";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
} from "../../src/server/db/test-safety";

export default async function globalSetup() {
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
    },
    stdio: "inherit",
  });
}
