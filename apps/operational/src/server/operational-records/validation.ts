import { z } from "zod";
import { uuidInputSchema } from "@/server/tenancy/validation";

export { validationIssues } from "@/server/tenancy/validation";

const normalizedSourceSystemPattern = /^[a-z0-9]+([._-][a-z0-9]+)*$/;

const requiredTrimmedString = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} must be ${maxLength} characters or fewer`);

const optionalNullableTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .nullable()
    .optional();

export const sourceSystemInputSchema = z
  .string()
  .trim()
  .min(2, "source system must be at least 2 characters")
  .max(80, "source system must be 80 characters or fewer")
  .transform((value) => value.toLowerCase())
  .pipe(
    z.string().regex(
      normalizedSourceSystemPattern,
      "source system must contain lowercase letters, numbers, dots, underscores, and hyphens only",
    ),
  );

export const sourceIdInputSchema = requiredTrimmedString("source id", 160);

export const dateTimeInputSchema = z.union([
  z.date(),
  z
    .string()
    .trim()
    .datetime({
      offset: true,
      message: "date-time must be an ISO 8601 value with a timezone",
    })
    .transform((value) => new Date(value)),
]);

const isActiveInputSchema = z.boolean().default(true);

export const createProjectInputSchema = z.object({
  officeId: uuidInputSchema,
  sourceSystem: sourceSystemInputSchema,
  sourceProjectId: sourceIdInputSchema,
  projectNumber: requiredTrimmedString("project number", 80),
  name: requiredTrimmedString("project name", 160),
  isActive: isActiveInputSchema,
});

export const createTechnicianInputSchema = z.object({
  officeId: uuidInputSchema,
  sourceSystem: sourceSystemInputSchema,
  sourceTechnicianId: sourceIdInputSchema,
  displayName: requiredTrimmedString("technician display name", 160),
  operationalRole: optionalNullableTrimmedString(120),
  workEmail: z.string().trim().email().max(254).nullable().optional(),
  workPhone: optionalNullableTrimmedString(40),
  isActive: isActiveInputSchema,
});

export const createWorkOrderInputSchema = z
  .object({
    officeId: uuidInputSchema,
    projectId: uuidInputSchema,
    sourceSystem: sourceSystemInputSchema,
    sourceWorkOrderId: sourceIdInputSchema,
    workOrderNumber: requiredTrimmedString("work order number", 80),
    serviceType: requiredTrimmedString("service type", 120),
    jobSiteName: requiredTrimmedString("job site name", 200),
    scheduledStartAt: dateTimeInputSchema,
    scheduledEndAt: dateTimeInputSchema,
    isActive: isActiveInputSchema,
  })
  .superRefine((input, context) => {
    if (input.scheduledEndAt.getTime() <= input.scheduledStartAt.getTime()) {
      context.addIssue({
        code: "custom",
        path: ["scheduledEndAt"],
        message: "scheduled end must be after scheduled start",
      });
    }
  });

export const createDispatchAssignmentInputSchema = z
  .object({
    officeId: uuidInputSchema,
    workOrderId: uuidInputSchema,
    technicianId: uuidInputSchema,
    sourceSystem: sourceSystemInputSchema,
    sourceAssignmentId: sourceIdInputSchema,
    assignmentStartAt: dateTimeInputSchema,
    assignmentEndAt: dateTimeInputSchema,
    isActive: isActiveInputSchema,
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

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreateTechnicianInput = z.infer<typeof createTechnicianInputSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderInputSchema>;
export type CreateDispatchAssignmentInput = z.infer<
  typeof createDispatchAssignmentInputSchema
>;
