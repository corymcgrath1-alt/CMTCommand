import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { offices } from "@/server/db/schema/offices";
import { uuidInputSchema, validationIssues } from "./validation";

export const organizationWideAccessScopeSchema = z.object({
  organizationId: uuidInputSchema,
  officeAccess: z.literal("all"),
});

export const officeLimitedAccessScopeSchema = z.object({
  organizationId: uuidInputSchema,
  officeAccess: z.literal("restricted"),
  officeIds: z.array(uuidInputSchema).transform((officeIds) => [
    ...new Set(officeIds),
  ]),
});

export const tenantAccessScopeSchema = z.discriminatedUnion("officeAccess", [
  organizationWideAccessScopeSchema,
  officeLimitedAccessScopeSchema,
]);

export type OrganizationWideAccessScope = z.infer<typeof organizationWideAccessScopeSchema>;
export type OfficeLimitedAccessScope = z.infer<typeof officeLimitedAccessScopeSchema>;
export type TenantAccessScope = z.infer<typeof tenantAccessScopeSchema>;

export type ScopeParseResult =
  | {
      status: "ok";
      scope: TenantAccessScope;
    }
  | {
      status: "validation_error";
      issues: string[];
    };

export function parseTenantAccessScope(input: unknown): ScopeParseResult {
  const parsed = tenantAccessScopeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  return {
    status: "ok",
    scope: parsed.data,
  };
}

export function officeScopePredicate(scope: TenantAccessScope): SQL {
  const organizationPredicate = eq(offices.organizationId, scope.organizationId);

  if (scope.officeAccess === "all") {
    return organizationPredicate;
  }

  if (scope.officeIds.length === 0) {
    return requirePredicate(and(organizationPredicate, sql`false`));
  }

  return requirePredicate(and(organizationPredicate, inArray(offices.id, scope.officeIds)));
}

export function officeIsAllowedByScope(scope: TenantAccessScope, officeId: string): boolean {
  if (scope.officeAccess === "all") {
    return true;
  }

  return scope.officeIds.includes(officeId);
}

function requirePredicate(predicate: SQL | undefined): SQL {
  return predicate ?? sql`false`;
}
