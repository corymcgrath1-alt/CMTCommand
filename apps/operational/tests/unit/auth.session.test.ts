import { describe, expect, it } from "vitest";
import type { DevelopmentAuthConfig } from "../../src/server/auth/runtime-config";
import {
  issueDevelopmentSession,
  verifyDevelopmentSession,
} from "../../src/server/auth/session";

const config: DevelopmentAuthConfig = {
  mode: "development",
  secret: "test-only-session-secret-with-32-characters",
  allowedSubjects: ["alpha-admin", "alpha-viewer"],
};
const now = new Date("2026-07-15T12:00:00.000Z");

describe("signed development sessions", () => {
  it("round-trips an explicitly allowlisted provider subject", () => {
    const token = issueDevelopmentSession(config, "alpha-admin", { now });

    expect(verifyDevelopmentSession(config, token, now)).toEqual({
      identity: {
        provider: "cmtcommand-development",
        providerSubject: "alpha-admin",
      },
      activeOrganizationId: undefined,
    });
  });

  it("round-trips a server-controlled active organization selection", () => {
    const activeOrganizationId = "10000000-0000-4000-8000-000000000001";
    const token = issueDevelopmentSession(config, "alpha-admin", {
      now,
      activeOrganizationId,
    });

    expect(verifyDevelopmentSession(config, token, now)?.activeOrganizationId).toBe(
      activeOrganizationId,
    );
  });

  it("rejects a subject that is not allowlisted", () => {
    expect(() => issueDevelopmentSession(config, "attacker", { now })).toThrow(
      /not_allowed/,
    );
  });

  it("rejects a modified payload", () => {
    const token = issueDevelopmentSession(config, "alpha-admin", { now });
    const [payload, signature] = token.split(".");
    const changedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}`;

    expect(
      verifyDevelopmentSession(config, `${changedPayload}.${signature}`, now),
    ).toBeNull();
  });

  it("rejects a modified signature", () => {
    const token = issueDevelopmentSession(config, "alpha-admin", { now });
    expect(verifyDevelopmentSession(config, `${token}x`, now)).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = issueDevelopmentSession(config, "alpha-admin", { now });
    const expiredAt = new Date(now.getTime() + 8 * 60 * 60 * 1000 + 1_000);

    expect(verifyDevelopmentSession(config, token, expiredAt)).toBeNull();
  });

  it("rejects a session signed with another secret", () => {
    const token = issueDevelopmentSession(config, "alpha-admin", { now });
    const otherConfig = { ...config, secret: "another-test-secret-with-32-characters" };

    expect(verifyDevelopmentSession(otherConfig, token, now)).toBeNull();
  });

  it("rejects malformed tokens without exposing parsing failures", () => {
    expect(verifyDevelopmentSession(config, "not-a-token", now)).toBeNull();
    expect(verifyDevelopmentSession(config, "a.b.c", now)).toBeNull();
  });
});
