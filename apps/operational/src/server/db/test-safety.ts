import { parseServerEnv, ServerEnvError } from "@/lib/env/server";

export const KNOWN_TEST_DATABASE_NAME = "cmtcommand_operational_test";
export const DESTRUCTIVE_TEST_DATABASE_AUTHORIZATION =
  "ALLOW_CMT_TEST_DATABASE_RESET";

const allowedLoopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const unsafeDatabasePattern =
  /(^|[^a-z0-9])(prod|production|pilot-production|staging)([^a-z0-9]|$)/i;

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
  databaseHost: string;
};

export type AuthorizedTestDatabaseCleanupConfig = SafeTestDatabaseConfig & {
  destructiveCleanupAuthorized: true;
};

export function getSafeTestDatabaseConfig(
  input: Record<string, string | undefined> = process.env,
): SafeTestDatabaseConfig {
  let env: ReturnType<typeof parseServerEnv>;

  try {
    env = parseServerEnv(input);
  } catch (error) {
    if (error instanceof ServerEnvError) {
      throw new TestDatabaseSafetyError(
        "Environment validation failed for test database use.",
      );
    }

    throw error;
  }

  if (env.APP_ENV !== "test") {
    throw new TestDatabaseSafetyError("APP_ENV=test is required for database tests.");
  }

  if (!env.TEST_DATABASE_URL) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_URL is required for database tests.",
    );
  }

  const expectedDatabaseName = readRequiredProof(
    input,
    "TEST_DATABASE_EXPECTED_NAME",
  );
  const expectedDatabaseHost = readRequiredProof(
    input,
    "TEST_DATABASE_EXPECTED_HOST",
  ).toLowerCase();
  const parsedUrl = new URL(env.TEST_DATABASE_URL);
  const databaseHost = parsedUrl.hostname.toLowerCase();
  let databaseName: string;

  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
  } catch {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_URL must include a valid database identity.",
    );
  }

  if (!databaseName) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_URL must include a database name.",
    );
  }

  if (unsafeDatabasePattern.test(`${databaseHost} ${databaseName}`)) {
    throw new TestDatabaseSafetyError(
      "Refusing to use an unsafe-looking database host or name for database tests.",
    );
  }

  if (expectedDatabaseName !== KNOWN_TEST_DATABASE_NAME) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_EXPECTED_NAME must identify the exact repository test database.",
    );
  }

  if (databaseName !== expectedDatabaseName) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_URL does not match TEST_DATABASE_EXPECTED_NAME.",
    );
  }

  if (!allowedLoopbackHosts.has(expectedDatabaseHost)) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_EXPECTED_HOST must identify an allowed loopback host.",
    );
  }

  if (databaseHost !== expectedDatabaseHost) {
    throw new TestDatabaseSafetyError(
      "TEST_DATABASE_URL does not match TEST_DATABASE_EXPECTED_HOST.",
    );
  }

  return {
    databaseUrl: env.TEST_DATABASE_URL,
    redactedDatabaseUrl: redactDatabaseUrl(env.TEST_DATABASE_URL),
    databaseName,
    databaseHost,
  };
}

export function getAuthorizedTestDatabaseCleanupConfig(
  input: Record<string, string | undefined> = process.env,
): AuthorizedTestDatabaseCleanupConfig {
  const config = getSafeTestDatabaseConfig(input);
  const authorization = input.TEST_DATABASE_RESET_AUTHORIZATION?.trim();

  if (authorization !== DESTRUCTIVE_TEST_DATABASE_AUTHORIZATION) {
    throw new TestDatabaseSafetyError(
      "Explicit destructive test database cleanup authorization is required.",
    );
  }

  return {
    ...config,
    destructiveCleanupAuthorized: true,
  };
}

export async function runAuthorizedTestDatabaseCleanup(
  config: AuthorizedTestDatabaseCleanupConfig,
  readLiveDatabaseName: () => Promise<string | undefined>,
  destructiveCleanup: () => Promise<void>,
): Promise<void> {
  if (
    config.destructiveCleanupAuthorized !== true ||
    config.databaseName !== KNOWN_TEST_DATABASE_NAME ||
    !allowedLoopbackHosts.has(config.databaseHost)
  ) {
    throw new TestDatabaseSafetyError(
      "Destructive test database cleanup is not authorized.",
    );
  }

  const liveDatabaseName = await readLiveDatabaseName();

  if (liveDatabaseName !== config.databaseName) {
    throw new TestDatabaseSafetyError(
      "Connected live database identity does not match the authorized test database.",
    );
  }

  await destructiveCleanup();
}

export function redactDatabaseUrl(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);
  const username = parsedUrl.username ? "<user>" : "";
  const password = parsedUrl.password ? ":<password>" : "";
  const credentials = username ? `${username}${password}@` : "";

  return `${parsedUrl.protocol}//${credentials}${parsedUrl.host}${parsedUrl.pathname}`;
}

function readRequiredProof(
  input: Record<string, string | undefined>,
  name: "TEST_DATABASE_EXPECTED_NAME" | "TEST_DATABASE_EXPECTED_HOST",
): string {
  const value = input[name]?.trim();

  if (!value) {
    throw new TestDatabaseSafetyError(`${name} is required for database tests.`);
  }

  return value;
}
