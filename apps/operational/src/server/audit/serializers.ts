import type {
  DispatchAssignmentRecord,
  MembershipStatus,
  OfficeAccessPolicy,
  OrganizationRole,
  ProjectRecord,
  ServiceTypeRecord,
  TechnicianOfficeEligibilityRecord,
  TechnicianRecord,
  WorkOrderRecord,
} from "@/server/db/schema";
import type { SafeAuditState } from "./validation";

type MembershipAuditSource = {
  role: OrganizationRole;
  status: MembershipStatus;
  officeAccess: OfficeAccessPolicy;
  version: number;
};

export function membershipAuditState(
  membership: MembershipAuditSource,
  officeIds?: readonly string[],
): SafeAuditState {
  return {
    role: membership.role,
    status: membership.status,
    officePolicy: membership.officeAccess,
    version: membership.version,
    ...(officeIds ? { officeIds: [...officeIds].sort() } : {}),
  };
}

export function projectAuditState(project: ProjectRecord): SafeAuditState {
  return {
    officeId: project.officeId,
    status: project.status,
    version: project.version,
  };
}

export function serviceTypeAuditState(value: ServiceTypeRecord): SafeAuditState {
  return {
    officeId: value.officeId,
    key: value.key,
    category: value.category,
    status: value.status,
    version: value.version,
  };
}

export function technicianAuditState(
  technician: TechnicianRecord,
  eligibleOfficeIds?: readonly string[],
): SafeAuditState {
  return {
    status: technician.status,
    homeOfficeId: technician.homeOfficeId,
    eligibleOfficeIds: [...(eligibleOfficeIds ?? [])].sort(),
    membershipLinked: technician.organizationMembershipId !== null,
    organizationMembershipId: technician.organizationMembershipId,
    version: technician.version,
  };
}

export function technicianEligibilityAuditState(
  eligibility: Pick<
    TechnicianOfficeEligibilityRecord,
    "technicianId" | "officeId"
  >,
): SafeAuditState {
  return {
    technicianId: eligibility.technicianId,
    officeId: eligibility.officeId,
    eligible: true,
  };
}

export function workOrderAuditState(workOrder: WorkOrderRecord): SafeAuditState {
  return {
    status: workOrder.status,
    priority: workOrder.priority,
    serviceTypeId: workOrder.serviceTypeId,
    requestedStartAt: workOrder.scheduledStartAt.toISOString(),
    requestedEndAt: workOrder.scheduledEndAt.toISOString(),
    version: workOrder.version,
  };
}

export function assignmentAuditState(
  assignment: DispatchAssignmentRecord,
  supportTechnicianIds: readonly string[] = [],
  conflictOverride = false,
): SafeAuditState {
  return {
    status: assignment.status,
    scheduleStartAt: assignment.assignmentStartAt.toISOString(),
    scheduleEndAt: assignment.assignmentEndAt.toISOString(),
    primaryTechnicianId: assignment.technicianId,
    supportTechnicianIds: [...supportTechnicianIds].sort(),
    version: assignment.version,
    conflictOverride,
  };
}
