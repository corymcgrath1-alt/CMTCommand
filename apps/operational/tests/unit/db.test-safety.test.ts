import { describe, expect, it, vi } from "vitest";
import {
  DESTRUCTIVE_TEST_DATABASE_AUTHORIZATION,
  getAuthorizedTestDatabaseCleanupConfig,
  getSafeTestDatabaseConfig,
  KNOWN_TEST_DATABASE_NAME,
  redactDatabaseUrl,
  runAuthorizedTestDatabaseCleanup,
  TestDatabaseSafetyError,
} from "../../src/server/db/test-safety";

const localTestEnvironment = (
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> => ({
  APP_ENV: "test",
  TEST_DATABASE_URL:
    "postgresql://user:secret@localhost:5432/cmtcommand_operational_test",
  TEST_DATABASE_EXPECTED_NAME: KNOWN_TEST_DATABASE_NAME,
  TEST_DATABASE_EXPECTED_HOST: "localhost",
  TEST_DATABASE_RESET_AUTHORIZATION: DESTRUCTIVE_TEST_DATABASE_AUTHORIZATION,
  ...overrides,
});

describe("test database safety", () => {
  it("requires APP_ENV=test", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          APP_ENV: "development",
        }),
      ),
    ).toThrow(TestDatabaseSafetyError);
  });

  it("requires TEST_DATABASE_URL and never falls back to DATABASE_URL", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL: undefined,
          DATABASE_URL:
            "postgresql://user:secret@localhost:5432/cmtcommand_operational_test",
        }),
      ),
    ).toThrow(/TEST_DATABASE_URL/);
  });

  it("rejects customer_test on an arbitrary remote host", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL: "postgresql://user:secret@db.example.test:5432/customer_test",
          TEST_DATABASE_EXPECTED_NAME: "customer_test",
          TEST_DATABASE_EXPECTED_HOST: "db.example.test",
        }),
      ),
    ).toThrow(TestDatabaseSafetyError);
  });

  it("rejects a database name that merely contains test", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL:
            "postgresql://user:secret@localhost:5432/cmtcommand_operational_test_copy",
          TEST_DATABASE_EXPECTED_NAME: "cmtcommand_operational_test_copy",
        }),
      ),
    ).toThrow(/exact repository test database/);
  });

  it("requires an explicit expected database identity", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_EXPECTED_NAME: undefined,
        }),
      ),
    ).toThrow(/TEST_DATABASE_EXPECTED_NAME/);
  });

  it("rejects an incorrect expected database identity", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_EXPECTED_NAME: "another_operational_test",
        }),
      ),
    ).toThrow(/exact repository test database/);
  });

  it("requires an explicitly allowed test database host", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_EXPECTED_HOST: undefined,
        }),
      ),
    ).toThrow(/TEST_DATABASE_EXPECTED_HOST/);
  });

  it("rejects a non-loopback host even when the expected host matches", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL:
            "postgresql://user:secret@shared.example.test:5432/cmtcommand_operational_test",
          TEST_DATABASE_EXPECTED_HOST: "shared.example.test",
        }),
      ),
    ).toThrow(/loopback/);
  });

  it("rejects prohibited production-like database identities", () => {
    expect(() =>
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL: "postgresql://user:secret@localhost:5432/production_test",
          TEST_DATABASE_EXPECTED_NAME: "production_test",
        }),
      ),
    ).toThrow(/unsafe-looking/);
  });

  it("accepts the correctly configured local test database", () => {
    expect(getSafeTestDatabaseConfig(localTestEnvironment())).toMatchObject({
      databaseName: KNOWN_TEST_DATABASE_NAME,
      databaseHost: "localhost",
      redactedDatabaseUrl:
        "postgresql://<user>:<password>@localhost:5432/cmtcommand_operational_test",
    });
  });

  it("accepts the GitHub Actions PostgreSQL service configuration", () => {
    expect(
      getAuthorizedTestDatabaseCleanupConfig({
        APP_ENV: "test",
        TEST_DATABASE_URL:
          "postgresql://cmtcommand_test:cmtcommand_test_password@localhost:5432/cmtcommand_operational_test",
        TEST_DATABASE_EXPECTED_NAME: "cmtcommand_operational_test",
        TEST_DATABASE_EXPECTED_HOST: "localhost",
        TEST_DATABASE_RESET_AUTHORIZATION: "ALLOW_CMT_TEST_DATABASE_RESET",
      }),
    ).toMatchObject({
      databaseName: KNOWN_TEST_DATABASE_NAME,
      databaseHost: "localhost",
      destructiveCleanupAuthorized: true,
    });
  });

  it("requires explicit authorization for destructive cleanup", () => {
    expect(() =>
      getAuthorizedTestDatabaseCleanupConfig(
        localTestEnvironment({
          TEST_DATABASE_RESET_AUTHORIZATION: undefined,
        }),
      ),
    ).toThrow(/destructive test database cleanup authorization/);
  });

  it("rejects URL and live database identity mismatch before cleanup", async () => {
    const config = getAuthorizedTestDatabaseCleanupConfig(localTestEnvironment());
    const cleanup = vi.fn(async () => undefined);

    await expect(
      runAuthorizedTestDatabaseCleanup(config, async () => "customer_test", cleanup),
    ).rejects.toThrow(/live database identity/);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("does not reach destructive cleanup when the live identity proof is missing", async () => {
    const config = getAuthorizedTestDatabaseCleanupConfig(localTestEnvironment());
    const cleanup = vi.fn(async () => undefined);

    await expect(
      runAuthorizedTestDatabaseCleanup(config, async () => undefined, cleanup),
    ).rejects.toThrow(/live database identity/);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("reaches destructive cleanup only after every proof matches", async () => {
    const config = getAuthorizedTestDatabaseCleanupConfig(localTestEnvironment());
    const cleanup = vi.fn(async () => undefined);

    await runAuthorizedTestDatabaseCleanup(
      config,
      async () => KNOWN_TEST_DATABASE_NAME,
      cleanup,
    );

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("redacts credentials from diagnostics and safety errors", () => {
    const secret = "do-not-log-this-password";
    const databaseUrl =
      `postgresql://safety_user:${secret}@localhost:5432/cmtcommand_operational_test`;
    const config = getSafeTestDatabaseConfig(
      localTestEnvironment({
        TEST_DATABASE_URL: databaseUrl,
      }),
    );

    expect(config.redactedDatabaseUrl).toBe(
      "postgresql://<user>:<password>@localhost:5432/cmtcommand_operational_test",
    );
    expect(config.redactedDatabaseUrl).not.toContain(secret);

    try {
      getSafeTestDatabaseConfig(
        localTestEnvironment({
          TEST_DATABASE_URL:
            `postgresql://safety_user:${secret}@remote.example.test:5432/customer_test`,
          TEST_DATABASE_EXPECTED_NAME: "customer_test",
          TEST_DATABASE_EXPECTED_HOST: "remote.example.test",
        }),
      );
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain(databaseUrl);
      return;
    }

    throw new Error("Expected the unsafe database configuration to be rejected.");
  });

  it("redacts credentials before display", () => {
    expect(
      redactDatabaseUrl("postgresql://user:secret@localhost:5432/cmtcommand_operational_test"),
    ).toBe("postgresql://<user>:<password>@localhost:5432/cmtcommand_operational_test");
  });
});
