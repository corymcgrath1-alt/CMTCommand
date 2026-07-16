import type { OrganizationRole } from "@/server/db/schema";
import type { AuthorizationContext } from "./types";

export const permissionValues = [
  "organization.read",
  "organization.members.read",
  "organization.members.manage",
  "organization.roles.manage",
  "office.read",
  "office.assignments.manage",
] as const;

export type Permission = (typeof permissionValues)[number];

const readPermissions: Permission[] = ["organization.read", "office.read"];

const rolePermissions: Record<OrganizationRole, Permission[]> = {
  organization_admin: [
    ...readPermissions,
    "organization.members.read",
    "organization.members.manage",
    "organization.roles.manage",
    "office.assignments.manage",
  ],
  operations_manager: readPermissions,
  dispatcher: readPermissions,
  technical_reviewer: readPermissions,
  field_technician: readPermissions,
  viewer: readPermissions,
};

const organizationWideOfficeRoles = new Set<OrganizationRole>([
  "organization_admin",
  "operations_manager",
  "technical_reviewer",
  "viewer",
]);

export class AuthorizationError extends Error {
  readonly code: "missing_permission" | "office_inaccessible";

  constructor(code: "missing_permission" | "office_inaccessible") {
    super(code);
    this.name = "AuthorizationError";
    this.code = code;
  }
}
export function permissionsForRole(role: OrganizationRole): Permission[] {
  return [...rolePermissions[role]];
}

export function roleMayUseOrganizationWideOfficeAccess(
  role: OrganizationRole,
): boolean {
  return organizationWideOfficeRoles.has(role);
}

export function hasPermission(
  context: AuthorizationContext,
  permission: Permission,
): boolean {
  return context.permissions.includes(permission);
}

export function requirePermission(
  context: AuthorizationContext,
  permission: Permission,
): void {
  if (!hasPermission(context, permission)) {
    throw new AuthorizationError("missing_permission");
  }
}

export function canAccessOffice(
  context: AuthorizationContext,
  officeId: string,
): boolean {
  return (
    context.tenantScope.officeAccess === "all" ||
    context.tenantScope.officeIds.includes(officeId)
  );
}

export function requireOfficeAccess(
  context: AuthorizationContext,
  officeId: string,
): void {
  if (!canAccessOffice(context, officeId)) {
    throw new AuthorizationError("office_inaccessible");
  }
}

export function getAuthorizedOfficeIds(
  context: AuthorizationContext,
): "all" | string[] {
  return context.tenantScope.officeAccess === "all"
    ? "all"
    : [...context.tenantScope.officeIds];
}

export function requireOrganizationMembership(
  context: AuthorizationContext,
  organizationId: string,
): void {
  if (context.membership.organizationId !== organizationId) {
    throw new AuthorizationError("missing_permission");
  }
}
