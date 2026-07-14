import { describe, expect, it } from "vitest";
import {
  getSafeTestDatabaseConfig,
  redactDatabaseUrl,
  TestDatabaseSafetyError,
} from "../../src/server/db/test-safety";

describe("test database safety", () => {
  it("requires APP_ENV=test", () => {
    expect(() =>
      getSafeTestDatabaseConfig({
        APP_ENV: "development",
        TEST_DATABASE_URL: "postgresql://user:secret@localhost:5432/cmtcommand_test",
      }),
    ).toThrow(TestDatabaseSafetyError);
  });

  it("requires TEST_DATABASE_URL and never falls back to DATABASE_URL", () => {
    expect(() =>
      getSafeTestDatabaseConfig({
        APP_ENV: "test",
        DATABASE_URL: "postgresql://user:secret@localhost:5432/cmtcommand_test",
      }),
    ).toThrow(/TEST_DATABASE_URL/);
  });

  it("requires a clearly test-only database name", () => {
    expect(() =>
      getSafeTestDatabaseConfig({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://user:secret@localhost:5432/cmtcommand",
      }),
    ).toThrow(/test-only/);
  });

  it("rejects obviously unsafe database names", () => {
    expect(() =>
      getSafeTestDatabaseConfig({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://user:secret@localhost:5432/production_test",
      }),
    ).toThrow(/unsafe-looking/);
  });

  it("redacts credentials before display", () => {
    expect(
      redactDatabaseUrl("postgresql://user:secret@localhost:5432/cmtcommand_test"),
    ).toBe("postgresql://<user>:<password>@localhost:5432/cmtcommand_test");
  });
});
