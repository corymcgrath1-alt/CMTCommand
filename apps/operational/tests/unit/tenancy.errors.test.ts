import { describe, expect, it } from "vitest";
import { databaseFailure, getPostgresErrorInfo } from "../../src/server/tenancy/errors";

describe("tenancy error mapping", () => {
  it("extracts stable PostgreSQL codes and constraint names without using error text", () => {
    expect(
      getPostgresErrorInfo({
        code: "23505",
        constraint: "organizations_slug_unique",
        message: "duplicate key contains internal database text",
      }),
    ).toEqual({
      code: "23505",
      constraint: "organizations_slug_unique",
    });
  });

  it("returns a sanitized persistence failure", () => {
    expect(JSON.stringify(databaseFailure())).not.toContain("duplicate key");
    expect(databaseFailure()).toEqual({
      status: "persistence_error",
      reason: "database_error",
    });
  });
});
