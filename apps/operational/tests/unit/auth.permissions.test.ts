import { describe, expect, it } from "vitest";
import {
  canAccessOffice,
  hasPermission,
  permissionsForRole,
  requireOfficeAccess,
  requireOrganizationMembership,
  requirePermission,
  roleMayUseOrganizationWideOfficeAccess,
} from "../../src/server/auth/permissions";
import type { AuthorizationContext } from "../../src/server/auth/types";
import { statusTransitionAllowed } from "../../src/server/members/service";

const organizationId = "10000000-0000-4000-8000-000000000001";
const officeId = "20000000-0000-4000-8000-000000000001";
const domainReadPermissions = [
  "project.read",
  "work_order.read",
  "technician.read",
  "dispatch_assignment.read",
] as const;
const domainManagePermissions = [
  "project.manage",
  "work_order.manage",
  "technician.manage",
  "dispatch_assignment.manage",
] as const;

describe("centralized permissions", () => {
  it("allows organization admins to manage memberships, office access, and all domain records", () => {
    expect(permissionsForRole("organization_admin")).toEqual([
      "organization.read",
      "office.read",
      "organization.members.read",
      "organization.members.manage",
      "organization.roles.manage",
      "office.assignments.manage",
      ...domainReadPermissions,
      ...domainManagePermissions,
    ]);
  });

  it("allows operations managers to read and manage all domain records", () => {
    expect(permissionsForRole("operations_manager")).toEqual([
      "organization.read",
      "office.read",
      ...domainReadPermissions,
      ...domainManagePermissions,
    ]);
  });

  it("limits dispatchers to domain reads and dispatch-assignment management", () => {
    expect(permissionsForRole("dispatcher")).toEqual([
      "organization.read",
      "office.read",
      ...domainReadPermissions,
      "dispatch_assignment.manage",
    ]);
  });

  it("keeps technical reviewers domain-read-only", () => {
    expect(permissionsForRole("technical_reviewer")).toEqual([
      "organization.read",
      "office.read",
      ...domainReadPermissions,
    ]);
  });

  it("keeps viewers domain-read-only", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "organization.read",
      "office.read",
      ...domainReadPermissions,
    ]);
  });

  it("does not grant field technicians any domain permissions", () => {
    expect(permissionsForRole("field_technician")).toEqual([
      "organization.read",
      "office.read",
    ]);
  });

  it("preserves organization-admin membership and office-access permissions", () => {
    expect(permissionsForRole("organization_admin")).toEqual(
      expect.arrayContaining([
        "organization.members.manage",
        "organization.roles.manage",
        "office.assignments.manage",
      ]),
    );
  });

  it.each([
    "operations_manager",
    "dispatcher",
    "technical_reviewer",
    "field_technician",
    "viewer",
  ] as const)("does not grant membership management to %s", (role) => {
    expect(permissionsForRole(role)).not.toContain("organization.members.manage");
  });

  it("does not give technical reviewers implicit user management", () => {
    expect(permissionsForRole("technical_reviewer")).not.toContain(
      "organization.members.read",
    );
  });

  it("allows organization-wide office access only for explicit roles", () => {
    expect(roleMayUseOrganizationWideOfficeAccess("organization_admin")).toBe(true);
    expect(roleMayUseOrganizationWideOfficeAccess("operations_manager")).toBe(true);
    expect(roleMayUseOrganizationWideOfficeAccess("technical_reviewer")).toBe(true);
    expect(roleMayUseOrganizationWideOfficeAccess("viewer")).toBe(true);
    expect(roleMayUseOrganizationWideOfficeAccess("dispatcher")).toBe(false);
    expect(roleMayUseOrganizationWideOfficeAccess("field_technician")).toBe(false);
  });

  it("enforces restricted office assignments", () => {
    const context = restrictedContext("dispatcher");
    expect(canAccessOffice(context, officeId)).toBe(true);
    expect(
      canAccessOffice(context, "20000000-0000-4000-8000-000000000002"),
    ).toBe(false);
    expect(() =>
      requireOfficeAccess(
        context,
        "20000000-0000-4000-8000-000000000002",
      ),
    ).toThrow(/office_inaccessible/);
  });

  it("does not accept a different organization as context", () => {
    expect(() =>
      requireOrganizationMembership(
        restrictedContext("dispatcher"),
        "10000000-0000-4000-8000-000000000002",
      ),
    ).toThrow(/missing_permission/);
  });

  it("throws safe permission errors for writes the role lacks", () => {
    const context = restrictedContext("viewer");
    expect(hasPermission(context, "office.read")).toBe(true);
    expect(() =>
      requirePermission(context, "organization.members.manage"),
    ).toThrow(/missing_permission/);
  });

  it("keeps revoked membership state terminal", () => {
    expect(statusTransitionAllowed("revoked", "active")).toBe(false);
    expect(statusTransitionAllowed("revoked", "revoked")).toBe(true);
  });

  it("allows explicit activation and suspension lifecycle changes", () => {
    expect(statusTransitionAllowed("invited", "active")).toBe(true);
    expect(statusTransitionAllowed("active", "suspended")).toBe(true);
    expect(statusTransitionAllowed("suspended", "active")).toBe(true);
  });
});

function restrictedContext(
  role: AuthorizationContext["membership"]["role"],
): AuthorizationContext {
  return {
    user: {
      id: "30000000-0000-4000-8000-000000000001",
      email: "user@example.test",
      displayName: "Test User",
      status: "active",
    },
    membership: {
      id: "40000000-0000-4000-8000-000000000001",
      organizationId,
      organizationName: "Alpha Engineering",
      organizationStatus: "active",
      role,
      status: "active",
      officeAccess: "restricted",
      officeIds: [officeId],
    },
    permissions: permissionsForRole(role),
    tenantScope: {
      organizationId,
      officeAccess: "restricted",
      officeIds: [officeId],
    },
  };
}
