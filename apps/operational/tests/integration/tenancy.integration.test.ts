import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDatabasePool, getDatabase, type OperationalDatabase } from "../../src/server/db/client";
import { getSafeTestDatabaseConfig } from "../../src/server/db/test-safety";
import { organizations } from "../../src/server/db/schema";
import {
  createOfficeForOrganization,
  createOrganization,
  findAccessibleOfficeByCode,
  findAccessibleOfficeById,
  findOrganizationBySlug,
  listAccessibleOffices,
} from "../../src/server/tenancy/repository";
import type { OfficeRecord, OrganizationRecord } from "../../src/server/db/schema";

let db: OperationalDatabase;

beforeAll(() => {
  const config = getSafeTestDatabaseConfig();
  db = getDatabase(config.databaseUrl);
});

beforeEach(async () => {
  await cleanupTestRows(db);
});

afterAll(async () => {
  await cleanupTestRows(db);
  await closeDatabasePool();
});

describe("organization and office tenancy foundation", () => {
  it("has the migrated organization and office tables", async () => {
    const result = await db.execute<{
      organizations_exists: string | null;
      offices_exists: string | null;
    }>(sql`
      select
        to_regclass('public.organizations')::text as organizations_exists,
        to_regclass('public.offices')::text as offices_exists
    `);

    expect(result.rows[0]).toEqual({
      organizations_exists: "organizations",
      offices_exists: "offices",
    });
  });

  it("creates organizations and finds them by normalized slug", async () => {
    const organization = await mustCreateOrganization("Acme Pilot", "Acme Pilot");
    const found = await findOrganizationBySlug(db, " ACME  Pilot ");

    expect(found.status).toBe("found");
    expect(found.status === "found" ? found.value.id : undefined).toBe(organization.id);
  });

  it("rejects duplicate normalized organization slugs", async () => {
    await mustCreateOrganization("Acme Pilot", "Acme Pilot");

    await expect(createOrganization(db, { slug: " acme_pilot ", name: "Duplicate" })).resolves.toEqual({
      status: "conflict",
      reason: "organization_slug_already_exists",
    });
  });

  it("creates offices, enforces organization ownership, and allows duplicate codes across organizations", async () => {
    const organizationA = await mustCreateOrganization("Alpha", "Alpha Testing");
    const organizationB = await mustCreateOrganization("Beta", "Beta Testing");

    const alphaMain = await mustCreateOffice(organizationA.id, "main", "Alpha Main");
    const betaMain = await mustCreateOffice(organizationB.id, "main", "Beta Main");

    expect(alphaMain.code).toBe("MAIN");
    expect(betaMain.code).toBe("MAIN");
    expect(alphaMain.organizationId).not.toBe(betaMain.organizationId);
  });

  it("rejects duplicate office codes inside one organization", async () => {
    const organization = await mustCreateOrganization("Alpha", "Alpha Testing");
    await mustCreateOffice(organization.id, "main", "Main");

    await expect(
      createOfficeForOrganization(db, {
        organizationId: organization.id,
        code: "MAIN",
        name: "Duplicate",
        timeZone: "America/Chicago",
      }),
    ).resolves.toEqual({
      status: "conflict",
      reason: "office_code_already_exists",
    });
  });

  it("maps a missing organization foreign key without exposing database details", async () => {
    const result = await createOfficeForOrganization(db, {
      organizationId: randomUUID(),
      code: "MAIN",
      name: "Main",
      timeZone: "America/Chicago",
    });

    expect(result).toEqual({
      status: "not_found_or_inaccessible",
    });
    expect(JSON.stringify(result)).not.toContain("offices_organization_id_fk");
  });

  it("lists and looks up only offices inside an organization-wide scope", async () => {
    const { organizationA, organizationB, alphaMain, alphaLab, betaMain } =
      await createTwoOrganizationFixture();

    const list = await listAccessibleOffices(db, {
      organizationId: organizationA.id,
      officeAccess: "all",
    });

    expect(list.status).toBe("ok");
    expect(list.status === "ok" ? list.values.map((office) => office.id) : []).toEqual([
      alphaLab.id,
      alphaMain.id,
    ]);

    await expect(
      findAccessibleOfficeById(
        db,
        { organizationId: organizationA.id, officeAccess: "all" },
        { officeId: betaMain.id },
      ),
    ).resolves.toEqual({
      status: "not_found_or_inaccessible",
    });

    await expect(
      findAccessibleOfficeByCode(
        db,
        { organizationId: organizationB.id, officeAccess: "all" },
        { code: alphaMain.code },
      ),
    ).resolves.toMatchObject({
      status: "found",
      value: {
        id: betaMain.id,
      },
    });
  });

  it("applies restricted office scope inside one organization", async () => {
    const { organizationA, alphaMain, alphaLab } = await createTwoOrganizationFixture();
    const restrictedScope = {
      organizationId: organizationA.id,
      officeAccess: "restricted" as const,
      officeIds: [alphaMain.id],
    };

    const list = await listAccessibleOffices(db, restrictedScope);
    expect(list.status).toBe("ok");
    expect(list.status === "ok" ? list.values.map((office) => office.id) : []).toEqual([
      alphaMain.id,
    ]);

    await expect(
      findAccessibleOfficeById(db, restrictedScope, { officeId: alphaLab.id }),
    ).resolves.toEqual({
      status: "not_found_or_inaccessible",
    });
  });

  it("returns no offices for an empty restricted scope", async () => {
    const { organizationA, alphaMain } = await createTwoOrganizationFixture();

    const list = await listAccessibleOffices(db, {
      organizationId: organizationA.id,
      officeAccess: "restricted",
      officeIds: [],
    });

    expect(list).toEqual({
      status: "ok",
      values: [],
    });

    await expect(
      findAccessibleOfficeById(
        db,
        { organizationId: organizationA.id, officeAccess: "restricted", officeIds: [] },
        { officeId: alphaMain.id },
      ),
    ).resolves.toEqual({
      status: "not_found_or_inaccessible",
    });
  });

  it("does not let office identifiers override organization scope", async () => {
    const { organizationA, betaMain } = await createTwoOrganizationFixture();

    const list = await listAccessibleOffices(db, {
      organizationId: organizationA.id,
      officeAccess: "restricted",
      officeIds: [betaMain.id],
    });

    expect(list).toEqual({
      status: "ok",
      values: [],
    });
  });

  it("makes inaccessible and nonexistent office lookup results equivalent", async () => {
    const { organizationA, betaMain } = await createTwoOrganizationFixture();
    const scope = { organizationId: organizationA.id, officeAccess: "all" as const };

    const inaccessible = await findAccessibleOfficeById(db, scope, { officeId: betaMain.id });
    const nonexistent = await findAccessibleOfficeById(db, scope, { officeId: randomUUID() });

    expect(inaccessible).toEqual(nonexistent);
    expect(inaccessible).toEqual({
      status: "not_found_or_inaccessible",
    });
  });

  it("prevents organization deletion while offices exist", async () => {
    const organization = await mustCreateOrganization("Delete Guard", "Delete Guard");
    const office = await mustCreateOffice(organization.id, "main", "Main");

    await expect(
      db.delete(organizations).where(eq(organizations.id, organization.id)),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "offices_organization_id_fk",
    });

    const list = await listAccessibleOffices(db, {
      organizationId: organization.id,
      officeAccess: "all",
    });

    expect(list.status === "ok" ? list.values.map((value) => value.id) : []).toEqual([
      office.id,
    ]);
  });

  it("maps predictable database errors to safe public results", async () => {
    const organization = await mustCreateOrganization("Safe Errors", "Safe Errors");
    await mustCreateOffice(organization.id, "main", "Main");

    const result = await createOfficeForOrganization(db, {
      organizationId: organization.id,
      code: "main",
      name: "Duplicate",
      timeZone: "America/Chicago",
    });

    expect(result).toEqual({
      status: "conflict",
      reason: "office_code_already_exists",
    });
    expect(JSON.stringify(result)).not.toContain("duplicate key");
    expect(JSON.stringify(result)).not.toContain("offices_organization_code_unique");
  });
});

async function createTwoOrganizationFixture(): Promise<{
  organizationA: OrganizationRecord;
  organizationB: OrganizationRecord;
  alphaMain: OfficeRecord;
  alphaLab: OfficeRecord;
  betaMain: OfficeRecord;
}> {
  const organizationA = await mustCreateOrganization("Alpha", "Alpha Testing");
  const organizationB = await mustCreateOrganization("Beta", "Beta Testing");
  const alphaMain = await mustCreateOffice(organizationA.id, "main", "Alpha Main");
  const alphaLab = await mustCreateOffice(organizationA.id, "lab", "Alpha Lab");
  const betaMain = await mustCreateOffice(organizationB.id, "main", "Beta Main");

  return {
    organizationA,
    organizationB,
    alphaMain,
    alphaLab,
    betaMain,
  };
}

async function mustCreateOrganization(
  slug: string,
  name: string,
): Promise<OrganizationRecord> {
  const result = await createOrganization(db, { slug, name });

  if (result.status !== "created") {
    throw new Error(`Expected organization creation to succeed: ${JSON.stringify(result)}`);
  }

  return result.value;
}

async function mustCreateOffice(
  organizationId: string,
  code: string,
  name: string,
): Promise<OfficeRecord> {
  const result = await createOfficeForOrganization(db, {
    organizationId,
    code,
    name,
    timeZone: "America/Chicago",
  });

  if (result.status !== "created") {
    throw new Error(`Expected office creation to succeed: ${JSON.stringify(result)}`);
  }

  return result.value;
}

async function cleanupTestRows(database: OperationalDatabase): Promise<void> {
  await database.execute(sql`truncate table "offices", "organizations" restart identity cascade`);
}
