import type { OrganizationRole } from "@/server/db/schema";
import type { AuthorizationContext } from "./types";

export const permissionValues = [
  "organization.read",
  "organization.members.read",
  "organization.members.manage",
  "organization.roles.manage",
  "office.read",
  "office.assignments.manage",
  "service_type.read",
  "service_type.manage",
  "project.read",
  "project.manage",
  "work_order.read",
  "work_order.manage",
  "technician.read",
  "technician.manage",
  "dispatch_assignment.read",
  "dispatch_assignment.manage",
  "dispatch_assignment.assign",
  "dispatch_assignment.transition",
  "dispatch_assignment.conflict_override",
  "dispatch_assignment.read_own",
  "dispatch_assignment.acknowledge_own",
  "audit.read",
  "audit.read_security",
] as const;

export type Permission = (typeof permissionValues)[number];

const readPermissions: Permission[] = ["organization.read", "office.read"];

const domainReadPermissions: Permission[] = [
  "service_type.read",
  "project.read",
  "work_order.read",
  "technician.read",
  "dispatch_assignment.read",
];

const domainManagePermissions: Permission[] = [
  "service_type.manage",
  "project.manage",
  "work_order.manage",
  "technician.manage",
  "dispatch_assignment.manage",
];

const dispatchWorkflowManagePermissions: Permission[] = [
  "dispatch_assignment.assign",
  "dispatch_assignment.transition",
  "dispatch_assignment.conflict_override",
];

const rolePermissions: Record<OrganizationRole, Permission[]> = {
  organization_admin: [
    ...readPermissions,
    "organization.members.read",
    "organization.members.manage",
    "organization.roles.manage",
    "office.assignments.manage",
    ...domainReadPermissions,
    ...domainManagePermissions,
    ...dispatchWorkflowManagePermissions,
    "audit.read",
    "audit.read_security",
  ],
  operations_manager: [
    ...readPermissions,
    ...domainReadPermissions,
    ...domainManagePermissions,
    ...dispatchWorkflowManagePermissions,
    "audit.read",
  ],
  dispatcher: [
    ...readPermissions,
    ...domainReadPermissions,
    "work_order.manage",
    "dispatch_assignment.manage",
    "dispatch_assignment.assign",
    "dispatch_assignment.transition",
  ],
  technical_reviewer: [...readPermissions, ...domainReadPermissions],
  field_technician: [
    ...readPermissions,
    "dispatch_assignment.read_own",
    "dispatch_assignment.acknowledge_own",
  ],
  viewer: [...readPermissions, ...domainReadPermissions],
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
