import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getSafeTestDatabaseConfig, TestDatabaseSafetyError } from "../src/server/db/test-safety";
import { closeDatabasePool, getDatabase } from "../src/server/db/client";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  try {
    const config = getSafeTestDatabaseConfig();
    const db = getDatabase(config.databaseUrl);

    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log(`Test database migrations applied to ${config.redactedDatabaseUrl}.`);
  } catch (error) {
    if (error instanceof TestDatabaseSafetyError) {
      fail(error.message);
      return;
    }

    fail("Test database migration failed with an unexpected internal error.");
  } finally {
    await closeDatabasePool();
  }
}

void main();
