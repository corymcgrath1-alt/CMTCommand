import { z } from "zod";
import {
  dispatchAssignmentStatusValues,
  workOrderStatusValues,
} from "@/server/db/schema";
import { uuidInputSchema } from "@/server/tenancy/validation";
import { dateTimeInputSchema } from "@/server/operational-records/validation";

const expectedVersionSchema = z.coerce.number().int().positive();
const optionalReasonSchema = z.string().trim().min(1).max(600).nullable().optional();
const overrideReasonSchema = z.string().trim().min(8).max(600).optional();
const booleanFlagSchema = z
  .preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  )
  .default(false);

export const workOrderTransitionInputSchema = z.object({
  workOrderId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  toStatus: z.enum(workOrderStatusValues),
  reason: optionalReasonSchema,
});

export const assignmentTransitionInputSchema = z.object({
  assignmentId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  toStatus: z.enum(dispatchAssignmentStatusValues),
  reason: optionalReasonSchema,
});

export const assignTechnicianInputSchema = z.object({
  assignmentId: uuidInputSchema,
  technicianId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  overrideConflicts: booleanFlagSchema,
  overrideReason: overrideReasonSchema,
});

export const removeAssignmentTechnicianInputSchema = z.object({
  assignmentId: uuidInputSchema,
  technicianId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  reason: z.string().trim().min(1).max(600),
});

export const updateAssignmentScheduleInputSchema = z
  .object({
    assignmentId: uuidInputSchema,
    expectedVersion: expectedVersionSchema,
    assignmentStartAt: dateTimeInputSchema,
    assignmentEndAt: dateTimeInputSchema,
    overrideConflicts: booleanFlagSchema,
    overrideReason: overrideReasonSchema,
  })
  .superRefine((input, context) => {
    if (input.assignmentEndAt.getTime() <= input.assignmentStartAt.getTime()) {
      context.addIssue({
        code: "custom",
        path: ["assignmentEndAt"],
        message: "assignment end must be after assignment start",
      });
    }
  });

export type WorkOrderTransitionInput = z.infer<
  typeof workOrderTransitionInputSchema
>;
export type AssignmentTransitionInput = z.infer<
  typeof assignmentTransitionInputSchema
>;
