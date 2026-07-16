import { describe, expect, it } from "vitest";
import { parseServerEnv } from "../../src/lib/env/server";
import {
  AuthConfigurationError,
  DEVELOPMENT_IDENTITY_PROVIDER,
  getAuthRuntimeConfig,
} from "../../src/server/auth/runtime-config";
import {
  assertDevelopmentIdentitySeedingAllowed,
  developmentIdentityFixtures,
  developmentOffices,
  developmentOrganizations,
} from "../../src/server/auth/development-fixtures";

describe("authentication runtime configuration", () => {
  it("fails closed by default while no production provider is selected", () => {
    expect(getAuthRuntimeConfig(parseServerEnv({}))).toEqual({
      mode: "disabled",
      reason: "provider_not_selected",
    });
  });

  it("enables the explicit development adapter only with a secret and allowlist", () => {
    expect(
      getAuthRuntimeConfig(
        parseServerEnv({
          APP_ENV: "development",
          NODE_ENV: "development",
          AUTH_MODE: "development",
          AUTH_SESSION_SECRET: "a".repeat(32),
          AUTH_DEVELOPMENT_SUBJECTS: "alpha-admin, alpha-viewer,alpha-admin",
        }),
      ),
    ).toEqual({
      mode: "development",
      secret: "a".repeat(32),
      allowedSubjects: ["alpha-admin", "alpha-viewer"],
    });
  });

  it("rejects the development adapter in APP_ENV production", () => {
    expect(() =>
      getAuthRuntimeConfig(
        parseServerEnv({
          APP_ENV: "production",
          AUTH_MODE: "development",
          AUTH_SESSION_SECRET: "a".repeat(32),
          AUTH_DEVELOPMENT_SUBJECTS: "alpha-admin",
        }),
      ),
    ).toThrow(AuthConfigurationError);
  });

  it("rejects the development adapter in a production Node runtime", () => {
    expect(() =>
      getAuthRuntimeConfig(
        parseServerEnv({
          APP_ENV: "development",
          NODE_ENV: "production",
          AUTH_MODE: "development",
          AUTH_SESSION_SECRET: "a".repeat(32),
          AUTH_DEVELOPMENT_SUBJECTS: "alpha-admin",
        }),
      ),
    ).toThrow(/forbidden/);
  });

  it("rejects a short development session secret", () => {
    expect(() =>
      getAuthRuntimeConfig(
        parseServerEnv({
          APP_ENV: "test",
          NODE_ENV: "test",
          AUTH_MODE: "development",
          AUTH_SESSION_SECRET: "too-short",
          AUTH_DEVELOPMENT_SUBJECTS: "alpha-admin",
        }),
      ),
    ).toThrow(/32/);
  });

  it("requires an explicit development subject allowlist", () => {
    expect(() =>
      getAuthRuntimeConfig(
        parseServerEnv({
          APP_ENV: "test",
          NODE_ENV: "test",
          AUTH_MODE: "development",
          AUTH_SESSION_SECRET: "a".repeat(32),
        }),
      ),
    ).toThrow(/AUTH_DEVELOPMENT_SUBJECTS/);
  });

  it("defines deterministic identities for every required role and denied state", () => {
    const subjects = developmentIdentityFixtures.map((fixture) => fixture.subject);
    const roles = developmentIdentityFixtures.flatMap((fixture) =>
      fixture.memberships.map((membership) => membership.role),
    );

    expect(new Set(roles)).toEqual(
      new Set([
        "organization_admin",
        "operations_manager",
        "dispatcher",
        "technical_reviewer",
        "field_technician",
        "viewer",
      ]),
    );
    expect(subjects).toEqual(
      expect.arrayContaining([
        "alpha-suspended",
        "alpha-disabled",
        "no-membership",
        "beta-admin",
        "beta-dispatcher",
        "multi-organization-viewer",
      ]),
    );
  });

  it("matches the deterministic Phase 5D acceptance organizations, offices, and restricted scopes", () => {
    expect(developmentOrganizations.map(({ name }) => name)).toEqual([
      "Alpha Engineering",
      "Beta Testing",
    ]);
    expect(developmentOffices.map(({ name }) => name)).toEqual([
      "Alexandria",
      "Richmond",
      "Fairfax",
      "Manassas",
    ]);

    const alphaTechnician = developmentIdentityFixtures.find(
      ({ subject }) => subject === "alpha-technician",
    );
    const betaDispatcher = developmentIdentityFixtures.find(
      ({ subject }) => subject === "beta-dispatcher",
    );

    expect(alphaTechnician?.memberships).toEqual([
      expect.objectContaining({
        organizationId: developmentOrganizations[0].id,
        officeAccess: "restricted",
        officeIds: [developmentOffices[0].id],
      }),
    ]);
    expect(betaDispatcher?.memberships).toEqual([
      expect.objectContaining({
        organizationId: developmentOrganizations[1].id,
        role: "dispatcher",
        status: "active",
        officeAccess: "restricted",
        officeIds: [developmentOffices[2].id],
      }),
    ]);
  });

  it("uses a provider name that is separate from application roles", () => {
    expect(DEVELOPMENT_IDENTITY_PROVIDER).toBe("cmtcommand-development");
    expect(DEVELOPMENT_IDENTITY_PROVIDER).not.toContain("admin");
  });

  it("forbids fixture seeding in production", () => {
    expect(() =>
      assertDevelopmentIdentitySeedingAllowed(
        parseServerEnv({ APP_ENV: "pilot-production" }),
      ),
    ).toThrow(/forbidden/);
  });
});
