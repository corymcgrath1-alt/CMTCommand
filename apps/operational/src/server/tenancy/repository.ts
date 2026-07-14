import { and, eq } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  offices,
  organizations,
  type OfficeRecord,
  type OrganizationRecord,
} from "@/server/db/schema";
import {
  databaseFailure,
  getPostgresErrorInfo,
  notFoundOrInaccessible,
  type CreateResult,
  type ListResult,
  type LookupResult,
} from "./errors";
import { officeScopePredicate, tenantAccessScopeSchema, type TenantAccessScope } from "./scope";
import {
  createOfficeInputSchema,
  createOrganizationInputSchema,
  officeCodeLookupInputSchema,
  officeIdInputSchema,
  organizationIdInputSchema,
  organizationSlugInputSchema,
  validationIssues,
} from "./validation";

export async function createOrganization(
  db: OperationalDatabase,
  input: unknown,
): Promise<CreateResult<OrganizationRecord>> {
  const parsed = createOrganizationInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  try {
    const [created] = await db.insert(organizations).values(parsed.data).returning();

    return {
      status: "created",
      value: created,
    };
  } catch (error) {
    const info = getPostgresErrorInfo(error);

    if (info.code === "23505" && info.constraint === "organizations_slug_unique") {
      return {
        status: "conflict",
        reason: "organization_slug_already_exists",
      };
    }

    return databaseFailure();
  }
}

export async function findOrganizationById(
  db: OperationalDatabase,
  input: unknown,
): Promise<LookupResult<OrganizationRecord>> {
  const parsed = organizationIdInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  try {
    const [record] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, parsed.data.organizationId))
      .limit(1);

    if (!record) {
      return notFoundOrInaccessible();
    }

    return {
      status: "found",
      value: record,
    };
  } catch {
    return databaseFailure();
  }
}

export async function findOrganizationBySlug(
  db: OperationalDatabase,
  input: unknown,
): Promise<LookupResult<OrganizationRecord>> {
  const parsed = organizationSlugInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  try {
    const [record] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, parsed.data))
      .limit(1);

    if (!record) {
      return notFoundOrInaccessible();
    }

    return {
      status: "found",
      value: record,
    };
  } catch {
    return databaseFailure();
  }
}

export async function createOfficeForOrganization(
  db: OperationalDatabase,
  input: unknown,
): Promise<CreateResult<OfficeRecord>> {
  const parsed = createOfficeInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  try {
    const [created] = await db.insert(offices).values(parsed.data).returning();

    return {
      status: "created",
      value: created,
    };
  } catch (error) {
    const info = getPostgresErrorInfo(error);

    if (info.code === "23503" && info.constraint === "offices_organization_id_fk") {
      return notFoundOrInaccessible();
    }

    if (info.code === "23505" && info.constraint === "offices_organization_code_unique") {
      return {
        status: "conflict",
        reason: "office_code_already_exists",
      };
    }

    return databaseFailure();
  }
}

export async function listAccessibleOffices(
  db: OperationalDatabase,
  input: unknown,
): Promise<ListResult<OfficeRecord>> {
  const parsed = tenantAccessScopeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsed.error),
    };
  }

  try {
    const values = await db
      .select()
      .from(offices)
      .where(officeScopePredicate(parsed.data))
      .orderBy(offices.code);

    return {
      status: "ok",
      values,
    };
  } catch {
    return databaseFailure();
  }
}

export async function findAccessibleOfficeById(
  db: OperationalDatabase,
  scopeInput: unknown,
  officeInput: unknown,
): Promise<LookupResult<OfficeRecord>> {
  const parsedScope = tenantAccessScopeSchema.safeParse(scopeInput);

  if (!parsedScope.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsedScope.error),
    };
  }

  const parsedOffice = officeIdInputSchema.safeParse(officeInput);

  if (!parsedOffice.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsedOffice.error),
    };
  }

  return findAccessibleOffice(parsedScope.data, db, eq(offices.id, parsedOffice.data.officeId));
}

export async function findAccessibleOfficeByCode(
  db: OperationalDatabase,
  scopeInput: unknown,
  officeInput: unknown,
): Promise<LookupResult<OfficeRecord>> {
  const parsedScope = tenantAccessScopeSchema.safeParse(scopeInput);

  if (!parsedScope.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsedScope.error),
    };
  }

  const parsedOffice = officeCodeLookupInputSchema.safeParse(officeInput);

  if (!parsedOffice.success) {
    return {
      status: "validation_error",
      issues: validationIssues(parsedOffice.error),
    };
  }

  return findAccessibleOffice(parsedScope.data, db, eq(offices.code, parsedOffice.data.code));
}

async function findAccessibleOffice(
  scope: TenantAccessScope,
  db: OperationalDatabase,
  officePredicate: ReturnType<typeof eq>,
): Promise<LookupResult<OfficeRecord>> {
  try {
    const [record] = await db
      .select()
      .from(offices)
      .where(and(officeScopePredicate(scope), officePredicate))
      .limit(1);

    if (!record) {
      return notFoundOrInaccessible();
    }

    return {
      status: "found",
      value: record,
    };
  } catch {
    return databaseFailure();
  }
}
