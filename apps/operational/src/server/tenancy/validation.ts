import { z } from "zod";
import { officeStatusValues } from "@/server/db/schema/offices";
import { organizationStatusValues } from "@/server/db/schema/organizations";

const normalizedOrganizationSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const normalizedOfficeCodePattern = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export const uuidInputSchema = z.string().uuid();

export const organizationStatusSchema = z.enum(organizationStatusValues);
export const officeStatusSchema = z.enum(officeStatusValues);

export function normalizeOrganizationSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function normalizeOfficeCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export const organizationSlugInputSchema = z
  .string()
  .trim()
  .min(1, "organization slug is required")
  .transform(normalizeOrganizationSlug)
  .pipe(
    z
      .string()
      .min(2, "organization slug must be at least 2 characters")
      .max(80, "organization slug must be 80 characters or fewer")
      .regex(
        normalizedOrganizationSlugPattern,
        "organization slug must contain lowercase letters, numbers, and single hyphens only",
      ),
  );

export const organizationNameInputSchema = z
  .string()
  .trim()
  .min(1, "organization name is required")
  .max(160, "organization name must be 160 characters or fewer");

export const officeCodeInputSchema = z
  .string()
  .trim()
  .min(1, "office code is required")
  .transform(normalizeOfficeCode)
  .pipe(
    z
      .string()
      .min(2, "office code must be at least 2 characters")
      .max(32, "office code must be 32 characters or fewer")
      .regex(
        normalizedOfficeCodePattern,
        "office code must contain uppercase letters, numbers, and single hyphens only",
      ),
  );

export const officeNameInputSchema = z
  .string()
  .trim()
  .min(1, "office name is required")
  .max(160, "office name must be 160 characters or fewer");

export const officeTimeZoneInputSchema = z
  .string()
  .trim()
  .min(1, "office time zone is required")
  .refine(isSupportedIanaTimeZone, "office time zone must be a supported IANA time zone");

export const createOrganizationInputSchema = z.object({
  slug: organizationSlugInputSchema,
  name: organizationNameInputSchema,
  status: organizationStatusSchema.default("active"),
});

export const organizationIdInputSchema = z.object({
  organizationId: uuidInputSchema,
});

export const createOfficeInputSchema = z.object({
  organizationId: uuidInputSchema,
  code: officeCodeInputSchema,
  name: officeNameInputSchema,
  timeZone: officeTimeZoneInputSchema,
  status: officeStatusSchema.default("active"),
});

export const officeIdInputSchema = z.object({
  officeId: uuidInputSchema,
});

export const officeCodeLookupInputSchema = z.object({
  code: officeCodeInputSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type CreateOfficeInput = z.infer<typeof createOfficeInputSchema>;

type IntlWithTimeZoneList = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

let supportedTimeZoneValues: Set<string> | null = null;

export function isSupportedIanaTimeZone(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return false;
  }

  const supportedValuesOf = (Intl as IntlWithTimeZoneList).supportedValuesOf;

  if (supportedValuesOf) {
    supportedTimeZoneValues ??= new Set(supportedValuesOf("timeZone"));

    if (supportedTimeZoneValues.has(trimmed)) {
      return true;
    }
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function validationIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "input";
    return `${path}: ${issue.message}`;
  });
}
