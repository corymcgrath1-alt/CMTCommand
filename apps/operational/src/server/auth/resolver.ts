import { permissionsForRole, roleMayUseOrganizationWideOfficeAccess } from "./permissions";
import type { AuthorizationRepository } from "./repository";
import type { AuthorizationState, VerifiedSession } from "./types";

export async function resolveAuthorizationState(
  repository: AuthorizationRepository,
  session: VerifiedSession,
): Promise<AuthorizationState> {
  const user = await repository.findUserByVerifiedIdentity(session.identity);

  if (!user) {
    return { status: "identity_unknown" };
  }

  if (user.status !== "active") {
    return { status: "user_denied", reason: user.status };
  }

  const memberships = await repository.listMembershipsForUser(user.id);

  if (memberships.length === 0) {
    return { status: "no_membership" };
  }

  const activeMemberships = memberships.filter(
    (membership) =>
      membership.status === "active" && membership.organizationStatus === "active",
  );

  let selectedMembership = session.activeOrganizationId
    ? memberships.find(
        (membership) => membership.organizationId === session.activeOrganizationId,
      )
    : undefined;

  if (session.activeOrganizationId && !selectedMembership) {
    return {
      status: "organization_selection_invalid",
      memberships: activeMemberships,
    };
  }

  if (!selectedMembership) {
    if (activeMemberships.length > 1) {
      return {
        status: "organization_selection_required",
        memberships: activeMemberships,
      };
    }

    selectedMembership = activeMemberships[0];
  }

  if (!selectedMembership) {
    const denied = memberships[0];

    return denied.organizationStatus !== "active"
      ? { status: "membership_denied", reason: "organization_inactive" }
      : { status: "membership_denied", reason: denied.status as "invited" | "suspended" | "revoked" };
  }

  if (selectedMembership.organizationStatus !== "active") {
    return { status: "membership_denied", reason: "organization_inactive" };
  }

  if (selectedMembership.status !== "active") {
    return { status: "membership_denied", reason: selectedMembership.status };
  }

  if (
    selectedMembership.officeAccess === "all" &&
    !roleMayUseOrganizationWideOfficeAccess(selectedMembership.role)
  ) {
    return { status: "office_policy_invalid" };
  }

  const tenantScope =
    selectedMembership.officeAccess === "all"
      ? {
          organizationId: selectedMembership.organizationId,
          officeAccess: "all" as const,
        }
      : {
          organizationId: selectedMembership.organizationId,
          officeAccess: "restricted" as const,
          officeIds: [...new Set(selectedMembership.officeIds)],
        };

  return {
    status: "authorized",
    context: {
      user: { ...user, status: "active" },
      membership: { ...selectedMembership, status: "active" },
      permissions: permissionsForRole(selectedMembership.role),
      tenantScope,
    },
  };
}
