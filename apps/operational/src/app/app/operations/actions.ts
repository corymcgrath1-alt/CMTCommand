"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import {
  addTechnicianEligibility,
  createServiceType,
  updateProject,
  updateTechnician,
  updateWorkOrder,
} from "@/server/operational-records/catalog-service";
import {
  createDispatchAssignment,
  createProject,
  createTechnician,
  createWorkOrder,
} from "@/server/operational-records/service";
import {
  acknowledgeOwnAssignment,
  addSupportTechnician,
  assignPrimaryTechnician,
  removeAssignmentTechnician,
  transitionAssignment,
  transitionWorkOrder,
} from "@/server/dispatch/service";

export async function createProjectAction(formData: FormData) {
  const request = await authorizedRequest("/app/projects");
  const result = await createProject(request.db, request.context, {
    officeId: formData.get("officeId"),
    sourceSystem: "cmtcommand.ui",
    sourceProjectId: formData.get("sourceProjectId"),
    projectNumber: formData.get("projectNumber"),
    name: formData.get("name"),
    address: nullable(formData.get("address")),
  });
  finish("/app/projects", result.status);
}

export async function updateProjectAction(formData: FormData) {
  const request = await authorizedRequest("/app/projects");
  const result = await updateProject(request.db, request.context, {
    projectId: formData.get("projectId"),
    expectedVersion: formData.get("expectedVersion"),
    officeId: formData.get("officeId"),
    projectNumber: formData.get("projectNumber"),
    name: formData.get("name"),
    address: nullable(formData.get("address")),
    status: formData.get("status"),
  });
  finish("/app/projects", result.status);
}

export async function createServiceTypeAction(formData: FormData) {
  const request = await authorizedRequest("/app/work-orders");
  const result = await createServiceType(request.db, request.context, {
    key: formData.get("key"),
    name: formData.get("name"),
    category: formData.get("category"),
  });
  finish("/app/work-orders", result.status);
}

export async function createTechnicianAction(formData: FormData) {
  const request = await authorizedRequest("/app/technicians");
  const result = await createTechnician(request.db, request.context, {
    officeId: formData.get("officeId"),
    sourceSystem: "cmtcommand.ui",
    sourceTechnicianId: formData.get("sourceTechnicianId"),
    displayName: formData.get("displayName"),
    operationalRole: nullable(formData.get("operationalRole")),
    workEmail: nullable(formData.get("workEmail")),
    organizationMembershipId: nullable(formData.get("organizationMembershipId")),
  });
  finish("/app/technicians", result.status);
}

export async function updateTechnicianAction(formData: FormData) {
  const request = await authorizedRequest("/app/technicians");
  const result = await updateTechnician(request.db, request.context, {
    technicianId: formData.get("technicianId"),
    expectedVersion: formData.get("expectedVersion"),
    officeId: formData.get("officeId"),
    displayName: formData.get("displayName"),
    operationalRole: nullable(formData.get("operationalRole")),
    workEmail: nullable(formData.get("workEmail")),
    workPhone: nullable(formData.get("workPhone")),
    organizationMembershipId: nullable(formData.get("organizationMembershipId")),
    status: formData.get("status"),
  });
  finish("/app/technicians", result.status);
}

export async function addTechnicianEligibilityAction(formData: FormData) {
  const request = await authorizedRequest("/app/technicians");
  const result = await addTechnicianEligibility(request.db, request.context, {
    technicianId: formData.get("technicianId"),
    officeId: formData.get("officeId"),
  });
  finish("/app/technicians", result.status);
}

export async function createWorkOrderAction(formData: FormData) {
  const request = await authorizedRequest("/app/work-orders");
  const result = await createWorkOrder(request.db, request.context, {
    officeId: formData.get("officeId"),
    projectId: formData.get("projectId"),
    serviceTypeId: formData.get("serviceTypeId"),
    sourceSystem: "cmtcommand.ui",
    sourceWorkOrderId: formData.get("sourceWorkOrderId"),
    workOrderNumber: formData.get("workOrderNumber"),
    jobSiteName: formData.get("jobSiteName"),
    priority: formData.get("priority"),
    dispatchInstructions: nullable(formData.get("dispatchInstructions")),
    scheduledStartAt: formData.get("scheduledStartAt"),
    scheduledEndAt: formData.get("scheduledEndAt"),
  });
  finish("/app/work-orders", result.status);
}

export async function transitionWorkOrderAction(formData: FormData) {
  const request = await authorizedRequest("/app/work-orders");
  const result = await transitionWorkOrder(request.db, request.context, {
    workOrderId: formData.get("workOrderId"),
    expectedVersion: formData.get("expectedVersion"),
    toStatus: formData.get("toStatus"),
    reason: nullable(formData.get("reason")),
  });
  finish("/app/work-orders", result.status);
}

export async function updateWorkOrderAction(formData: FormData) {
  const request = await authorizedRequest("/app/work-orders");
  const result = await updateWorkOrder(request.db, request.context, {
    workOrderId: formData.get("workOrderId"),
    expectedVersion: formData.get("expectedVersion"),
    projectId: formData.get("projectId"),
    serviceTypeId: formData.get("serviceTypeId"),
    workOrderNumber: formData.get("workOrderNumber"),
    jobSiteName: formData.get("jobSiteName"),
    priority: formData.get("priority"),
    dispatchInstructions: nullable(formData.get("dispatchInstructions")),
    scheduledStartAt: formData.get("scheduledStartAt"),
    scheduledEndAt: formData.get("scheduledEndAt"),
  });
  finish("/app/work-orders", result.status);
}

export async function createAssignmentAction(formData: FormData) {
  const request = await authorizedRequest("/app/dispatch");
  const result = await createDispatchAssignment(request.db, request.context, {
    officeId: formData.get("officeId"),
    workOrderId: formData.get("workOrderId"),
    sourceSystem: "cmtcommand.ui",
    sourceAssignmentId: formData.get("sourceAssignmentId"),
    assignmentStartAt: formData.get("assignmentStartAt"),
    assignmentEndAt: formData.get("assignmentEndAt"),
  });
  finish("/app/dispatch", result.status);
}

export async function assignPrimaryAction(formData: FormData) {
  const request = await authorizedRequest("/app/dispatch");
  const result = await assignPrimaryTechnician(request.db, request.context, {
    assignmentId: formData.get("assignmentId"),
    technicianId: formData.get("technicianId"),
    expectedVersion: formData.get("expectedVersion"),
    overrideConflicts: formData.get("overrideConflicts"),
    overrideReason: optional(formData.get("overrideReason")),
  });
  finish("/app/dispatch", result.status);
}

export async function addSupportAction(formData: FormData) {
  const request = await authorizedRequest("/app/dispatch");
  const result = await addSupportTechnician(request.db, request.context, {
    assignmentId: formData.get("assignmentId"),
    technicianId: formData.get("technicianId"),
    expectedVersion: formData.get("expectedVersion"),
    overrideConflicts: formData.get("overrideConflicts"),
    overrideReason: optional(formData.get("overrideReason")),
  });
  finish("/app/dispatch", result.status);
}

export async function removeAssignmentTechnicianAction(formData: FormData) {
  const request = await authorizedRequest("/app/dispatch");
  const result = await removeAssignmentTechnician(request.db, request.context, {
    assignmentId: formData.get("assignmentId"),
    technicianId: formData.get("technicianId"),
    expectedVersion: formData.get("expectedVersion"),
    reason: formData.get("reason"),
  });
  finish("/app/dispatch", result.status);
}

export async function transitionAssignmentAction(formData: FormData) {
  const request = await authorizedRequest("/app/dispatch");
  const result = await transitionAssignment(request.db, request.context, {
    assignmentId: formData.get("assignmentId"),
    expectedVersion: formData.get("expectedVersion"),
    toStatus: formData.get("toStatus"),
    reason: nullable(formData.get("reason")),
  });
  finish("/app/dispatch", result.status);
}

export async function acknowledgeOwnAssignmentAction(formData: FormData) {
  const request = await authorizedRequest("/app/my-assignments");
  const result = await acknowledgeOwnAssignment(request.db, request.context, {
    assignmentId: formData.get("assignmentId"),
    expectedVersion: formData.get("expectedVersion"),
    toStatus: "acknowledged",
  });
  finish("/app/my-assignments", result.status);
}

async function authorizedRequest(returnPath: string) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status !== "authorized" || !db) redirect(`${returnPath}?result=forbidden`);
  return { context: state.context, db };
}

function finish(path: string, status: string): never {
  revalidatePath(path);
  redirect(`${path}?result=${encodeURIComponent(status)}`);
}

function optional(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function nullable(value: FormDataEntryValue | null): string | null {
  return optional(value) ?? null;
}
