import { z } from "zod";
import {
  membershipStatusValues,
  officeAccessPolicyValues,
  organizationRoleValues,
} from "@/server/db/schema";

export const normalizedEmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const displayNameSchema = z.string().trim().min(1).max(160);
export const roleSchema = z.enum(organizationRoleValues);
export const membershipStatusSchema = z.enum(membershipStatusValues);
export const officeAccessPolicySchema = z.enum(officeAccessPolicyValues);

export const prepareMembershipInputSchema = z.object({
  email: normalizedEmailSchema,
  displayName: displayNameSchema,
  role: roleSchema,
  officeAccess: officeAccessPolicySchema,
  officeIds: z.array(z.string().uuid()).default([]),
});
export const membershipVersionInputSchema = z.object({
  membershipId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const updateMembershipRoleInputSchema = membershipVersionInputSchema.extend({
  role: roleSchema,
});

export const updateMembershipStatusInputSchema = membershipVersionInputSchema.extend({
  status: membershipStatusSchema,
});

export const updateOfficeAccessInputSchema = membershipVersionInputSchema.extend({
  officeAccess: officeAccessPolicySchema,
});

export const officeAssignmentInputSchema = z.object({
  membershipId: z.string().uuid(),
  officeId: z.string().uuid(),
});
