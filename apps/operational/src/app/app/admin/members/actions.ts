"use server";

import { redirect } from "next/navigation";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import {
  assignOfficeToMembership,
  changeMembershipRole,
  changeMembershipStatus,
  changeOfficeAccessPolicy,
  prepareOrganizationMembership,
  removeOfficeFromMembership,
  type MembershipMutationResult,
} from "@/server/members/service";

export async function prepareMembershipAction(formData: FormData): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await prepareOrganizationMembership(request.db, request.context, {
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    officeAccess: formData.get("officeAccess"),
    officeIds: formData.getAll("officeIds"),
  });
  redirectMutationResult(result);
}
export async function changeMembershipRoleAction(
  formData: FormData,
): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await changeMembershipRole(request.db, request.context, {
    membershipId: formData.get("membershipId"),
    expectedVersion: numberValue(formData.get("expectedVersion")),
    role: formData.get("role"),
  });
  redirectMutationResult(result);
}

export async function changeMembershipStatusAction(
  formData: FormData,
): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await changeMembershipStatus(request.db, request.context, {
    membershipId: formData.get("membershipId"),
    expectedVersion: numberValue(formData.get("expectedVersion")),
    status: formData.get("status"),
  });
  redirectMutationResult(result);
}

export async function changeOfficeAccessAction(formData: FormData): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await changeOfficeAccessPolicy(request.db, request.context, {
    membershipId: formData.get("membershipId"),
    expectedVersion: numberValue(formData.get("expectedVersion")),
    officeAccess: formData.get("officeAccess"),
  });
  redirectMutationResult(result);
}

export async function assignOfficeAction(formData: FormData): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await assignOfficeToMembership(request.db, request.context, {
    membershipId: formData.get("membershipId"),
    officeId: formData.get("officeId"),
  });
  redirectMutationResult(result);
}

export async function removeOfficeAction(formData: FormData): Promise<void> {
  const request = await authorizedRequest();

  if (!request) {
    redirectResult("forbidden");
  }

  const result = await removeOfficeFromMembership(request.db, request.context, {
    membershipId: formData.get("membershipId"),
    officeId: formData.get("officeId"),
  });
  redirectMutationResult(result);
}

async function authorizedRequest() {
  const { state, db } = await loadRequestAuthorization();

  return state.status === "authorized" && db
    ? { context: state.context, db }
    : null;
}

function numberValue(value: FormDataEntryValue | null): number {
  return typeof value === "string" ? Number(value) : Number.NaN;
}

function redirectMutationResult(result: MembershipMutationResult): never {
  redirectResult(result.status);
}

function redirectResult(result: string): never {
  const safeResult = /^[a-z_]+$/.test(result) ? result : "unavailable";
  redirect(`/app/admin/members?result=${safeResult}`);
}
