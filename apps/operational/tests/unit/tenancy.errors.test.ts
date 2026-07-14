import { describe, expect, it } from "vitest";
import { databaseFailure, getPostgresErrorInfo } from "../../src/server/tenancy/errors";

describe("tenancy error mapping", () => {
  it("extracts stable PostgreSQL codes and constraint names from raw errors", () => {
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

  it("extracts unique constraint metadata from Drizzle-wrapped errors", () => {
    expect(
      getPostgresErrorInfo({
        message: "Failed query: insert into organizations ...",
        query: "insert into organizations ...",
        params: ["sensitive-param"],
        cause: {
          code: "23505",
          constraint: "organizations_slug_unique",
          detail: "Key (slug)=(acme) already exists.",
        },
      }),
    ).toEqual({
      code: "23505",
      constraint: "organizations_slug_unique",
    });
  });

  it("extracts foreign-key metadata from raw errors", () => {
    expect(
      getPostgresErrorInfo({
        code: "23503",
        constraint: "offices_organization_id_fk",
      }),
    ).toEqual({
      code: "23503",
      constraint: "offices_organization_id_fk",
    });
  });

  it("extracts foreign-key metadata from nested Drizzle causes", () => {
    expect(
      getPostgresErrorInfo({
        message: "Failed query: delete from organizations ...",
        cause: {
          message: "adapter wrapper",
          cause: {
            code: "23503",
            constraint: "offices_organization_id_fk",
          },
        },
      }),
    ).toEqual({
      code: "23503",
      constraint: "offices_organization_id_fk",
    });
  });

  it("returns no PostgreSQL metadata for malformed or primitive causes", () => {
    expect(
      getPostgresErrorInfo({
        message: "Failed query",
        cause: "not an error object",
      }),
    ).toEqual({});

    expect(
      getPostgresErrorInfo({
        message: "Failed query",
        cause: {
          message: "wrapped",
          cause: 23505,
        },
      }),
    ).toEqual({});
  });

  it("does not traverse cause chains indefinitely", () => {
    const cyclicError: { cause?: unknown } = {};
    cyclicError.cause = cyclicError;

    expect(getPostgresErrorInfo(cyclicError)).toEqual({});
  });

  it("keeps unknown wrapped database failures generic and sanitized", () => {
    const wrappedError = {
      message: "Failed query: select * from organizations where secret = $1",
      query: "select * from organizations where secret = $1",
      params: ["secret-value"],
      cause: {
        code: "99999",
        detail: "raw driver message",
      },
    };

    expect(getPostgresErrorInfo(wrappedError)).toEqual({
      code: "99999",
      constraint: undefined,
    });
    expect(JSON.stringify(databaseFailure())).not.toContain("select *");
    expect(JSON.stringify(databaseFailure())).not.toContain("secret-value");
    expect(JSON.stringify(databaseFailure())).not.toContain("raw driver message");
    expect(JSON.stringify(databaseFailure())).not.toContain("99999");
  });

  it("returns a sanitized persistence failure", () => {
    expect(JSON.stringify(databaseFailure())).not.toContain("duplicate key");
    expect(databaseFailure()).toEqual({
      status: "persistence_error",
      reason: "database_error",
    });
  });
});
