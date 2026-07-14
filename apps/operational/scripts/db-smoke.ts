import { parseServerEnv, ServerEnvError } from "../src/lib/env/server";
import { checkDatabaseConnectivity } from "../src/server/db/check";
import { closeDatabasePool } from "../src/server/db/client";

function isObviouslyUnsafeDatabaseUrl(databaseUrl: string): boolean {
  return /prod|production|pilot-production/i.test(databaseUrl);
}

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  try {
    const env = parseServerEnv(process.env);
    const testDatabaseUrl = env.TEST_DATABASE_URL;

    if (!testDatabaseUrl) {
      fail("TEST_DATABASE_URL is required for npm run test:db.");
      return;
    }

    if (
      isObviouslyUnsafeDatabaseUrl(testDatabaseUrl) &&
      process.env.ALLOW_UNSAFE_DATABASE_SMOKE !== "true"
    ) {
      fail("Refusing to run the database smoke test against an unsafe-looking database name.");
      return;
    }

    const result = await checkDatabaseConnectivity({
      databaseUrl: testDatabaseUrl,
    });

    if (result.status !== "ok") {
      fail(`Database smoke test failed: ${result.reason}.`);
      return;
    }

    console.log("Database smoke test passed: SELECT 1 succeeded.");
  } catch (error) {
    if (error instanceof ServerEnvError) {
      fail("Environment validation failed for the database smoke test.");
      return;
    }

    fail("Database smoke test failed with an unexpected internal error.");
  } finally {
    await closeDatabasePool();
  }
}

await main();
