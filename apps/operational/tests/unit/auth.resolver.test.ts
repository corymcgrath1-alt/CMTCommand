import { describe, expect, it } from "vitest";
import { resolveAuthorizationState } from "../../src/server/auth/resolver";
import type { AuthorizationRepository } from "../../src/server/auth/repository";
import type {
  IdentityUser,
  MembershipAccessRecord,
  VerifiedSession,
} from "../../src/server/auth/types";

const organizationA = "10000000-0000-4000-8000-000000000001";
const organizationB = "10000000-0000-4000-8000-000000000002";
const officeA = "20000000-0000-4000-8000-000000000001";
const user: IdentityUser = {
  id: "30000000-0000-4000-8000-000000000001",
  email: "updated-email@example.test",
  displayName: "Alpha User",
  status: "active",
};
const session: VerifiedSession = {
  identity: {
    provider: "cmtcommand-development",
    providerSubject: "stable-provider-subject",
  },
};

describe("server-side authorization context resolution", () => {
  it("resolves a verified provider subject to the application user", async () => {
    const state = await resolveAuthorizationState(repository(user, [membership()]), session);
    expect(state.status).toBe("authorized");
    if (state.status === "authorized") {
      expect(state.context.user.email).toBe("updated-email@example.test");
    }
  });

  it("does not use email as the immutable external identity key", async () => {
    const changedEmailUser = { ...user, email: "another-email@example.test" };
    const state = await resolveAuthorizationState(
      repository(changedEmailUser, [membership()]),
      session,
    );
    expect(state.status).toBe("authorized");
  });

  it("fails closed for an unknown provider identity", async () => {
    await expect(
      resolveAuthorizationState(repository(null, []), session),
    ).resolves.toEqual({ status: "identity_unknown" });
  });

  it.each(["invited", "suspended", "disabled"] as const)(
    "denies a %s application user",
    async (status) => {
      const state = await resolveAuthorizationState(
        repository({ ...user, status }, [membership()]),
        session,
      );
      expect(state).toEqual({ status: "user_denied", reason: status });
    },
  );

  it("returns a safe no-membership state", async () => {
    await expect(
      resolveAuthorizationState(repository(user, []), session),
    ).resolves.toEqual({ status: "no_membership" });
  });

  it.each(["invited", "suspended", "revoked"] as const)(
    "denies a %s organization membership",
    async (status) => {
      const state = await resolveAuthorizationState(
        repository(user, [membership({ status })]),
        session,
      );
      expect(state).toEqual({ status: "membership_denied", reason: status });
    },
  );

  it("denies membership in an inactive organization", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership({ organizationStatus: "inactive" })]),
      session,
    );
    expect(state).toEqual({
      status: "membership_denied",
      reason: "organization_inactive",
    });
  });

  it("requires explicit selection when more than one active membership exists", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [
        membership(),
        membership({
          id: "40000000-0000-4000-8000-000000000002",
          organizationId: organizationB,
          organizationName: "Beta Testing",
        }),
      ]),
      session,
    );
    expect(state.status).toBe("organization_selection_required");
  });

  it("accepts an active organization only after membership validation", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership()]),
      { ...session, activeOrganizationId: organizationA },
    );
    expect(state.status).toBe("authorized");
  });

  it("rejects a browser-selected organization with no membership", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership()]),
      { ...session, activeOrganizationId: organizationB },
    );
    expect(state.status).toBe("organization_selection_invalid");
  });

  it("derives a restricted tenant scope from office assignments", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership()]),
      session,
    );
    expect(state.status).toBe("authorized");
    if (state.status === "authorized") {
      expect(state.context.tenantScope).toEqual({
        organizationId: organizationA,
        officeAccess: "restricted",
        officeIds: [officeA],
      });
    }
  });

  it("deduplicates office assignment IDs before creating scope", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership({ officeIds: [officeA, officeA] })]),
      session,
    );
    expect(state.status).toBe("authorized");
    if (state.status === "authorized" && state.context.tenantScope.officeAccess === "restricted") {
      expect(state.context.tenantScope.officeIds).toEqual([officeA]);
    }
  });

  it("rejects organization-wide office access for a dispatcher", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership({ role: "dispatcher", officeAccess: "all" })]),
      session,
    );
    expect(state).toEqual({ status: "office_policy_invalid" });
  });

  it("derives read-only permissions for a viewer", async () => {
    const state = await resolveAuthorizationState(
      repository(user, [membership({ role: "viewer", officeAccess: "all" })]),
      session,
    );
    expect(state.status).toBe("authorized");
    if (state.status === "authorized") {
      expect(state.context.permissions).toEqual([
        "organization.read",
        "office.read",
        "service_type.read",
        "project.read",
        "work_order.read",
        "technician.read",
        "dispatch_assignment.read",
      ]);
    }
  });
});

function membership(
  overrides: Partial<MembershipAccessRecord> = {},
): MembershipAccessRecord {
  return {
    id: "40000000-0000-4000-8000-000000000001",
    organizationId: organizationA,
    organizationName: "Alpha Engineering",
    organizationStatus: "active",
    role: "dispatcher",
    status: "active",
    officeAccess: "restricted",
    officeIds: [officeA],
    ...overrides,
  };
}
function repository(
  resolvedUser: IdentityUser | null,
  memberships: MembershipAccessRecord[],
): AuthorizationRepository {
  return {
    async findUserByVerifiedIdentity() {
      return resolvedUser;
    },
    async listMembershipsForUser() {
      return memberships;
    },
  };
}
