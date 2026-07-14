import { checkDatabaseConnectivity } from "../src/server/db/check";
import { closeDatabasePool } from "../src/server/db/client";
import { getSafeTestDatabaseConfig, TestDatabaseSafetyError } from "../src/server/db/test-safety";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  try {
    const config = getSafeTestDatabaseConfig();

    const result = await checkDatabaseConnectivity({
      databaseUrl: config.databaseUrl,
    });

    if (result.status !== "ok") {
      fail(`Database smoke test failed: ${result.reason}.`);
      return;
    }

    console.log(`Database smoke test passed for ${config.redactedDatabaseUrl}: SELECT 1 succeeded.`);
  } catch (error) {
    if (error instanceof TestDatabaseSafetyError) {
      fail(error.message);
      return;
    }

    fail("Database smoke test failed with an unexpected internal error.");
  } finally {
    await closeDatabasePool();
  }
}

void main();
