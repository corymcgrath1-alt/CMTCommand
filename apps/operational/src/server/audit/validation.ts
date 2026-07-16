import { Buffer } from "node:buffer";
import { z } from "zod";
import { uuidInputSchema } from "@/server/tenancy/validation";
import {
  auditActionValues,
  auditOutcomeValues,
  auditTargetTypeValues,
} from "./taxonomy";

const prohibitedAuditKey =
  /(password|passphrase|secret|token|cookie|authorization|credential|transcript|file.?content|media.?content|photo|video|audio|email|phone|address)/i;
const safeKey = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function inspectSafeJson(
  value: unknown,
  path: (string | number)[],
  context: z.RefinementCtx,
  depth: number,
): void {
  if (depth > 4) {
    context.addIssue({ code: "custom", path, message: "audit JSON is too deeply nested" });
    return;
  }

  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      context.addIssue({ code: "custom", path, message: "audit numbers must be finite" });
    }
    return;
  }
  if (typeof value === "string") {
    if (value.length > 600) {
      context.addIssue({ code: "custom", path, message: "audit strings are too long" });
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 40) {
      context.addIssue({ code: "custom", path, message: "audit arrays are too large" });
      return;
    }
    value.forEach((item, index) => inspectSafeJson(item, [...path, index], context, depth + 1));
    return;
  }
  if (typeof value !== "object") {
    context.addIssue({ code: "custom", path, message: "unsupported audit JSON value" });
    return;
  }

  const entries = Object.entries(value);
  if (entries.length > 40) {
    context.addIssue({ code: "custom", path, message: "audit objects have too many fields" });
    return;
  }
  for (const [key, item] of entries) {
    const itemPath = [...path, key];
    if (!safeKey.test(key)) {
      context.addIssue({ code: "custom", path: itemPath, message: "invalid audit field name" });
      continue;
    }
    if (prohibitedAuditKey.test(key)) {
      context.addIssue({ code: "custom", path: itemPath, message: "prohibited audit field" });
      continue;
    }
    inspectSafeJson(item, itemPath, context, depth + 1);
  }
}

function safeAuditObjectSchema(maxBytes: number) {
  return z
    .record(z.string(), z.unknown())
    .superRefine((value, context) => {
      inspectSafeJson(value, [], context, 0);
      if (Buffer.byteLength(JSON.stringify(value), "utf8") > maxBytes) {
        context.addIssue({ code: "custom", message: "audit JSON exceeds its size limit" });
      }
    });
}

export const safeAuditStateSchema = safeAuditObjectSchema(4096);
export const safeAuditMetadataSchema = safeAuditObjectSchema(8192);

export const auditRequestContextSchema = z.object({
  requestId: uuidInputSchema,
  correlationId: uuidInputSchema,
  transactionId: uuidInputSchema,
});

export const auditEventDetailsSchema = z.object({
  officeId: uuidInputSchema.nullable().optional(),
  action: z.enum(auditActionValues),
  outcome: z.enum(auditOutcomeValues),
  target: z.object({
    type: z.enum(auditTargetTypeValues),
    id: uuidInputSchema,
  }),
  secondaryTarget: z
    .object({
      type: z.enum(auditTargetTypeValues),
      id: uuidInputSchema,
    })
    .optional(),
  requestContext: auditRequestContextSchema,
  reason: z.string().trim().min(1).max(1000).nullable().optional(),
  previousState: safeAuditStateSchema.nullable().optional(),
  resultingState: safeAuditStateSchema.nullable().optional(),
  metadata: safeAuditMetadataSchema.nullable().optional(),
});

export type SafeAuditState = z.infer<typeof safeAuditStateSchema>;
export type SafeAuditMetadata = z.infer<typeof safeAuditMetadataSchema>;
export type AuditEventDetails = z.infer<typeof auditEventDetailsSchema>;
