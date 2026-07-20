import { describe, expect, it } from "vitest";
import {
  getLiveness,
  getReadiness,
  getReadinessHttpStatus,
} from "../../src/server/health/service";

describe("health service", () => {
  it("returns a stable liveness result", () => {
    expect(getLiveness()).toEqual({
      status: "ok",
      service: "cmtcommand-operational",
    });
  });

  it("maps database success to ready", async () => {
    const readiness = await getReadiness({
      env: {
        DATABASE_URL: "postgresql://db.example.test/cmtcommand",
      },
      checkDatabase: async () => ({ status: "ok" }),
    });

    expect(readiness).toEqual({
      status: "ready",
      service: "cmtcommand-operational",
      checks: {
        database: "ok",
      },
    });
    expect(getReadinessHttpStatus(readiness)).toBe(200);
  });

  it("maps missing database configuration to HTTP 503 readiness", async () => {
    const readiness = await getReadiness({
      env: {
        DATABASE_URL: undefined,
      },
    });

    expect(readiness).toEqual({
      status: "not_ready",
      service: "cmtcommand-operational",
      reason: "database_not_configured",
      checks: {
        database: "not_configured",
      },
    });
    expect(getReadinessHttpStatus(readiness)).toBe(503);
  });

  it("maps database failures to sanitized HTTP 503 readiness", async () => {
    const readiness = await getReadiness({
      env: {
        DATABASE_URL: "postgresql://db.example.test/cmtcommand",
      },
      checkDatabase: async () => ({
        status: "unavailable",
        reason: "database_unavailable",
      }),
    });

    expect(readiness).toEqual({
      status: "not_ready",
      service: "cmtcommand-operational",
      reason: "database_unavailable",
      checks: {
        database: "unavailable",
      },
    });
    expect(JSON.stringify(readiness)).not.toContain("db.example.test");
    expect(getReadinessHttpStatus(readiness)).toBe(503);
  });
});
