import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { TenantAccessScope } from "@/server/tenancy/scope";

export function operationalRecordScopePredicate(
  scope: TenantAccessScope,
  organizationColumn: AnyPgColumn,
  officeColumn: AnyPgColumn,
): SQL {
  const organizationPredicate = eq(organizationColumn, scope.organizationId);

  if (scope.officeAccess === "all") {
    return organizationPredicate;
  }

  if (scope.officeIds.length === 0) {
    return requirePredicate(and(organizationPredicate, sql`false`));
  }

  return requirePredicate(
    and(organizationPredicate, inArray(officeColumn, scope.officeIds)),
  );
}

function requirePredicate(predicate: SQL | undefined): SQL {
  return predicate ?? sql`false`;
}
