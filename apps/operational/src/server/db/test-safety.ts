import { parseServerEnv, ServerEnvError } from "@/lib/env/server";

const unsafeDatabasePattern = /(^|[^a-z0-9])(prod|production|pilot-production|staging)([^a-z0-9]|$)/i;

export class TestDatabaseSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestDatabaseSafetyError";
  }
}

export type SafeTestDatabaseConfig = {
  databaseUrl: string;
  redactedDatabaseUrl: string;
  databaseName: string;
};

export function getSafeTestDatabaseConfig(
  input: Record<string, string | undefined> = process.env,
): SafeTestDatabaseConfig {
  let env: ReturnType<typeof parseServerEnv>;

  try {
    env = parseServerEnv(input);
  } catch (error) {
    if (error instanceof ServerEnvError) {
      throw new TestDatabaseSafetyError("Environment validation failed for test database use.");
    }

    throw error;
  }

  if (env.APP_ENV !== "test") {
    throw new TestDatabaseSafetyError("APP_ENV=test is required for database tests.");
  }

  if (!env.TEST_DATABASE_URL) {
    throw new TestDatabaseSafetyError("TEST_DATABASE_URL is required for database tests.");
  }

  const parsedUrl = new URL(env.TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));

  if (!databaseName) {
    throw new TestDatabaseSafetyError("TEST_DATABASE_URL must include a database name.");
  }

  if (!/test/i.test(databaseName)) {
    throw new TestDatabaseSafetyError("TEST_DATABASE_URL database name must clearly be test-only.");
  }

  if (unsafeDatabasePattern.test(`${parsedUrl.hostname} ${databaseName}`)) {
    throw new TestDatabaseSafetyError(
      "Refusing to use an unsafe-looking database host or name for database tests.",
    );
  }

  return {
    databaseUrl: env.TEST_DATABASE_URL,
    redactedDatabaseUrl: redactDatabaseUrl(env.TEST_DATABASE_URL),
    databaseName,
  };
}

export function redactDatabaseUrl(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);
  const username = parsedUrl.username ? "<user>" : "";
  const password = parsedUrl.password ? ":<password>" : "";
  const credentials = username ? `${username}${password}@` : "";

  return `${parsedUrl.protocol}//${credentials}${parsedUrl.host}${parsedUrl.pathname}`;
}
