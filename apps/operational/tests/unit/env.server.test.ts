import { describe, expect, it } from "vitest";
import { parseServerEnv, ServerEnvError } from "../../src/lib/env/server";

describe("parseServerEnv", () => {
  it("defaults APP_ENV to development and treats blank database values as unconfigured", () => {
    expect(
      parseServerEnv({
        DATABASE_URL: "",
        TEST_DATABASE_URL: "   ",
      }),
    ).toEqual({
      APP_ENV: "development",
      NODE_ENV: undefined,
      DATABASE_URL: undefined,
      TEST_DATABASE_URL: undefined,
      AUTH_MODE: "disabled",
      AUTH_SESSION_SECRET: undefined,
      AUTH_DEVELOPMENT_SUBJECTS: undefined,
    });
  });

  it("accepts PostgreSQL connection URLs without exposing them to client code", () => {
    expect(
      parseServerEnv({
        APP_ENV: "test",
        DATABASE_URL: "postgresql://db.example.test/cmtcommand",
      }),
    ).toEqual({
      APP_ENV: "test",
      NODE_ENV: undefined,
      DATABASE_URL: "postgresql://db.example.test/cmtcommand",
      TEST_DATABASE_URL: undefined,
      AUTH_MODE: "disabled",
      AUTH_SESSION_SECRET: undefined,
      AUTH_DEVELOPMENT_SUBJECTS: undefined,
    });
  });

  it("rejects invalid application environments with sanitized issues", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "demo",
      }),
    ).toThrow(ServerEnvError);
  });

  it("rejects non-PostgreSQL database URLs without including secret values in the error message", () => {
    try {
      parseServerEnv({
        DATABASE_URL: "https://user:secret@example.test/db",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ServerEnvError);
      expect(String(error)).not.toContain("secret");
      return;
    }

    throw new Error("Expected parseServerEnv to reject the database URL.");
  });
});
