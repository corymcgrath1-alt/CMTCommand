import { z } from "zod";
import { uuidInputSchema } from "@/server/tenancy/validation";
import {
  projectStatusValues,
  serviceTypeCategoryValues,
  serviceTypeStatusValues,
  technicianStatusValues,
  workOrderPriorityValues,
} from "@/server/db/schema";

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

const expectedVersionSchema = z.coerce.number().int().positive();
const optionalDescriptionSchema = optionalNullableTrimmedString(600);

export const serviceTypeKeyInputSchema = z
  .string()
  .trim()
  .min(2, "service type key must be at least 2 characters")
  .max(80, "service type key must be 80 characters or fewer")
  .transform((value) => value.toLowerCase().replace(/[\s.]+/g, "_").replace(/_+/g, "_"))
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9]+([_-][a-z0-9]+)*$/,
        "service type key must contain lowercase letters, numbers, underscores, and hyphens only",
      ),
  );

export const createServiceTypeInputSchema = z.object({
  officeId: uuidInputSchema.nullable().optional(),
  key: serviceTypeKeyInputSchema,
  name: requiredTrimmedString("service type name", 160),
  category: z.enum(serviceTypeCategoryValues),
  status: z.enum(serviceTypeStatusValues).default("active"),
  description: optionalDescriptionSchema,
});

export const updateServiceTypeInputSchema = z.object({
  serviceTypeId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  officeId: uuidInputSchema.nullable().optional(),
  name: requiredTrimmedString("service type name", 160),
  category: z.enum(serviceTypeCategoryValues),
  status: z.enum(serviceTypeStatusValues),
  description: optionalDescriptionSchema,
});

export const createProjectInputSchema = z.object({
  officeId: uuidInputSchema,
  sourceSystem: sourceSystemInputSchema,
  sourceProjectId: sourceIdInputSchema,
  projectNumber: requiredTrimmedString("project number", 80),
  name: requiredTrimmedString("project name", 160),
  address: optionalNullableTrimmedString(300),
  status: z.enum(projectStatusValues).default("active"),
});

export const updateProjectInputSchema = z.object({
  projectId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  officeId: uuidInputSchema,
  projectNumber: requiredTrimmedString("project number", 80),
  name: requiredTrimmedString("project name", 160),
  address: optionalNullableTrimmedString(300),
  status: z.enum(projectStatusValues),
});

export const createTechnicianInputSchema = z.object({
  officeId: uuidInputSchema,
  sourceSystem: sourceSystemInputSchema,
  sourceTechnicianId: sourceIdInputSchema,
  displayName: requiredTrimmedString("technician display name", 160),
  operationalRole: optionalNullableTrimmedString(120),
  workEmail: z.string().trim().email().max(254).nullable().optional(),
  workPhone: optionalNullableTrimmedString(40),
  organizationMembershipId: uuidInputSchema.nullable().optional(),
  status: z.enum(technicianStatusValues).default("active"),
});

export const updateTechnicianInputSchema = z.object({
  technicianId: uuidInputSchema,
  expectedVersion: expectedVersionSchema,
  officeId: uuidInputSchema,
  displayName: requiredTrimmedString("technician display name", 160),
  operationalRole: optionalNullableTrimmedString(120),
  workEmail: z.string().trim().email().max(254).nullable().optional(),
  workPhone: optionalNullableTrimmedString(40),
  organizationMembershipId: uuidInputSchema.nullable().optional(),
  status: z.enum(technicianStatusValues),
});

export const technicianEligibilityInputSchema = z.object({
  technicianId: uuidInputSchema,
  officeId: uuidInputSchema,
});

export const createWorkOrderInputSchema = z
  .object({
    officeId: uuidInputSchema,
    projectId: uuidInputSchema,
    serviceTypeId: uuidInputSchema,
    sourceSystem: sourceSystemInputSchema,
    sourceWorkOrderId: sourceIdInputSchema,
    workOrderNumber: requiredTrimmedString("work order number", 80),
    jobSiteName: requiredTrimmedString("job site name", 200),
    priority: z.enum(workOrderPriorityValues).default("normal"),
    dispatchInstructions: optionalNullableTrimmedString(1000),
    scheduledStartAt: dateTimeInputSchema,
    scheduledEndAt: dateTimeInputSchema,
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
    sourceSystem: sourceSystemInputSchema,
    sourceAssignmentId: sourceIdInputSchema,
    assignmentStartAt: dateTimeInputSchema,
    assignmentEndAt: dateTimeInputSchema,
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

export const updateWorkOrderInputSchema = z
  .object({
    workOrderId: uuidInputSchema,
    expectedVersion: expectedVersionSchema,
    projectId: uuidInputSchema,
    serviceTypeId: uuidInputSchema,
    workOrderNumber: requiredTrimmedString("work order number", 80),
    jobSiteName: requiredTrimmedString("job site name", 200),
    priority: z.enum(workOrderPriorityValues),
    dispatchInstructions: optionalNullableTrimmedString(1000),
    scheduledStartAt: dateTimeInputSchema,
    scheduledEndAt: dateTimeInputSchema,
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

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreateTechnicianInput = z.infer<typeof createTechnicianInputSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderInputSchema>;
export type CreateDispatchAssignmentInput = z.infer<
  typeof createDispatchAssignmentInputSchema
>;
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeInputSchema>;
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianInputSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderInputSchema>;
