import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDatabasePool, getDatabase, type OperationalDatabase } from "../../src/server/db/client";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
  type AuthorizedTestDatabaseCleanupConfig,
} from "../../src/server/db/test-safety";
import {
  externalIdentities,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  users,
} from "../../src/server/db/schema";
import { createAuthorizationRepository } from "../../src/server/auth/repository";
import { resolveAuthorizationState } from "../../src/server/auth/resolver";
import type { AuthorizationContext } from "../../src/server/auth/types";
import {
  changeMembershipRole,
  changeMembershipStatus,
  prepareOrganizationMembership,
} from "../../src/server/members/service";
import { getPostgresErrorInfo } from "../../src/server/tenancy/errors";

let db: OperationalDatabase;
let testDatabaseConfig: AuthorizedTestDatabaseCleanupConfig;

beforeAll(() => {
  testDatabaseConfig = getAuthorizedTestDatabaseCleanupConfig();
  db = getDatabase(testDatabaseConfig.databaseUrl);
});

beforeEach(async () => {
  await cleanupTestRows(db);
});

afterAll(async () => {
  await cleanupTestRows(db);
  await closeDatabasePool();
});

describe("identity and authorization persistence", () => {
  it("resolves a provider subject after the application email changes", async () => {
    const fixture = await seedAuthorizationFixture(db);
    await db
      .update(users)
      .set({
        email: "changed@example.test",
        normalizedEmail: "changed@example.test",
      })
      .where(eq(users.id, fixture.dispatcherUserId));

    const state = await resolveAuthorizationState(
      createAuthorizationRepository(db),
      session("alpha-dispatcher", fixture.organizationAId),
    );

    expect(state.status).toBe("authorized");
    if (state.status === "authorized") {
      expect(state.context.user.email).toBe("changed@example.test");
    }
  });

  it("prevents duplicate provider and subject mappings", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const otherUser = await insertUser(db, "other@example.test", "Other User");

    const error = await captureDatabaseError(() =>
      db.insert(externalIdentities).values({
        userId: otherUser.id,
        provider: "cmtcommand-development",
        providerSubject: "alpha-dispatcher",
      }),
    );

    expect(getPostgresErrorInfo(error)).toMatchObject({
      code: "23505",
      constraint: "external_identities_provider_subject_unique",
    });
    expect(fixture.dispatcherUserId).not.toBe(otherUser.id);
  });

  it("prevents duplicate organization memberships", async () => {
    const fixture = await seedAuthorizationFixture(db);

    const error = await captureDatabaseError(() =>
      db.insert(organizationMemberships).values({
        organizationId: fixture.organizationAId,
        userId: fixture.dispatcherUserId,
        role: "viewer",
        status: "active",
        officeAccess: "restricted",
        createdByUserId: fixture.adminUserId,
        updatedByUserId: fixture.adminUserId,
      }),
    );

    expect(getPostgresErrorInfo(error)).toMatchObject({
      code: "23505",
      constraint: "organization_memberships_organization_user_unique",
    });
  });

  it("makes a cross-organization office assignment impossible", async () => {
    const fixture = await seedAuthorizationFixture(db);

    const error = await captureDatabaseError(() =>
      db.insert(officeAssignments).values({
        organizationId: fixture.organizationAId,
        organizationMembershipId: fixture.dispatcherMembershipId,
        officeId: fixture.betaOfficeId,
        createdByUserId: fixture.adminUserId,
      }),
    );

    expect(getPostgresErrorInfo(error)).toMatchObject({
      code: "23503",
      constraint: "office_assignments_office_organization_fk",
    });
  });

  it("prevents duplicate office assignments", async () => {
    const fixture = await seedAuthorizationFixture(db);

    const error = await captureDatabaseError(() =>
      db.insert(officeAssignments).values({
        organizationId: fixture.organizationAId,
        organizationMembershipId: fixture.dispatcherMembershipId,
        officeId: fixture.alphaOfficeId,
        createdByUserId: fixture.adminUserId,
      }),
    );

    expect(getPostgresErrorInfo(error)).toMatchObject({
      code: "23505",
      constraint: "office_assignments_membership_office_unique",
    });
  });

  it("derives only the assigned Alpha office for the dispatcher", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const state = await resolveAuthorizationState(
      createAuthorizationRepository(db),
      session("alpha-dispatcher", fixture.organizationAId),
    );

    expect(state.status).toBe("authorized");
    if (state.status === "authorized") {
      expect(state.context.tenantScope).toEqual({
        organizationId: fixture.organizationAId,
        officeAccess: "restricted",
        officeIds: [fixture.alphaOfficeId],
      });
    }
  });

  it("ignores caller role claims because permission comes from database context", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const dispatcher = await authorizedContext(
      db,
      "alpha-dispatcher",
      fixture.organizationAId,
    );

    const result = await prepareOrganizationMembership(db, dispatcher, {
      email: "prepared@example.test",
      displayName: "Prepared User",
      role: "organization_admin",
      officeAccess: "all",
      officeIds: [],
    });

    expect(result).toEqual({ status: "forbidden", reason: "missing_permission" });
  });

  it("prevents an administrator from demoting themselves", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await changeMembershipRole(db, admin, {
      membershipId: fixture.adminMembershipId,
      expectedVersion: 1,
      role: "viewer",
    });

    expect(result).toEqual({
      status: "forbidden",
      reason: "self_role_change_forbidden",
    });
  });

  it("prevents an administrator from suspending the final admin account", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await changeMembershipStatus(db, admin, {
      membershipId: fixture.adminMembershipId,
      expectedVersion: 1,
      status: "suspended",
    });

    expect(result).toEqual({
      status: "forbidden",
      reason: "self_status_change_forbidden",
    });
  });

  it("does not mutate a membership belonging to another organization", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await changeMembershipRole(db, admin, {
      membershipId: fixture.betaMembershipId,
      expectedVersion: 1,
      role: "viewer",
    });

    expect(result.status).toBe("not_found_or_inaccessible");
  });

  it("rejects a stale concurrent membership update", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await changeMembershipRole(db, admin, {
      membershipId: fixture.dispatcherMembershipId,
      expectedVersion: 99,
      role: "viewer",
    });

    expect(result.status).toBe("stale_update");
  });

  it("revalidates the acting membership inside a mutation transaction", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const staleAdminContext = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationAId,
    );
    await db
      .update(organizationMemberships)
      .set({ status: "suspended" })
      .where(eq(organizationMemberships.id, fixture.adminMembershipId));

    const result = await prepareOrganizationMembership(db, staleAdminContext, {
      email: "blocked@example.test",
      displayName: "Blocked User",
      role: "viewer",
      officeAccess: "all",
      officeIds: [],
    });

    expect(result).toEqual({ status: "forbidden", reason: "missing_permission" });
  });

  it("returns actor-attributed mutation metadata for a prepared membership", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await prepareOrganizationMembership(db, admin, {
      email: "new-dispatcher@example.test",
      displayName: "New Dispatcher",
      role: "dispatcher",
      officeAccess: "restricted",
      officeIds: [fixture.alphaOfficeId],
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.mutation).toMatchObject({
        action: "membership.prepared",
        actorUserId: fixture.adminUserId,
        organizationId: fixture.organizationAId,
        subjectId: result.membershipId,
      });
    }
  });

  it("rejects a prepared membership containing a Beta office", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(db, "alpha-admin", fixture.organizationAId);

    const result = await prepareOrganizationMembership(db, admin, {
      email: "cross-office@example.test",
      displayName: "Cross Office",
      role: "dispatcher",
      officeAccess: "restricted",
      officeIds: [fixture.betaOfficeId],
    });

    expect(result.status).toBe("not_found_or_inaccessible");
  });
});

async function seedAuthorizationFixture(database: OperationalDatabase) {
  const [organizationA, organizationB] = await database
    .insert(organizations)
    .values([
      { slug: `alpha-${randomUUID()}`, name: "Alpha Engineering" },
      { slug: `beta-${randomUUID()}`, name: "Beta Testing" },
    ])
    .returning();
  const [alphaOffice, betaOffice] = await database
    .insert(offices)
    .values([
      {
        organizationId: organizationA.id,
        code: "ALX",
        name: "Alexandria",
        timeZone: "America/New_York",
      },
      {
        organizationId: organizationB.id,
        code: "CLT",
        name: "Charlotte",
        timeZone: "America/New_York",
      },
    ])
    .returning();
  const admin = await insertUser(database, "admin@example.test", "Alpha Admin");
  const dispatcher = await insertUser(
    database,
    "dispatcher@example.test",
    "Alpha Dispatcher",
  );
  const betaAdmin = await insertUser(
    database,
    "beta-admin@example.test",
    "Beta Admin",
  );
  const [adminMembership, dispatcherMembership, betaMembership] = await database
    .insert(organizationMemberships)
    .values([
      {
        organizationId: organizationA.id,
        userId: admin.id,
        role: "organization_admin",
        status: "active",
        officeAccess: "all",
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
      },
      {
        organizationId: organizationA.id,
        userId: dispatcher.id,
        role: "dispatcher",
        status: "active",
        officeAccess: "restricted",
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
      },
      {
        organizationId: organizationB.id,
        userId: betaAdmin.id,
        role: "organization_admin",
        status: "active",
        officeAccess: "all",
        createdByUserId: betaAdmin.id,
        updatedByUserId: betaAdmin.id,
      },
    ])
    .returning();

  await database.insert(externalIdentities).values([
    {
      userId: admin.id,
      provider: "cmtcommand-development",
      providerSubject: "alpha-admin",
    },
    {
      userId: dispatcher.id,
      provider: "cmtcommand-development",
      providerSubject: "alpha-dispatcher",
    },
    {
      userId: betaAdmin.id,
      provider: "cmtcommand-development",
      providerSubject: "beta-admin",
    },
  ]);
  await database.insert(officeAssignments).values({
    organizationId: organizationA.id,
    organizationMembershipId: dispatcherMembership.id,
    officeId: alphaOffice.id,
    createdByUserId: admin.id,
  });

  return {
    organizationAId: organizationA.id,
    organizationBId: organizationB.id,
    alphaOfficeId: alphaOffice.id,
    betaOfficeId: betaOffice.id,
    adminUserId: admin.id,
    dispatcherUserId: dispatcher.id,
    adminMembershipId: adminMembership.id,
    dispatcherMembershipId: dispatcherMembership.id,
    betaMembershipId: betaMembership.id,
  };
}
async function insertUser(
  database: OperationalDatabase,
  email: string,
  displayName: string,
) {
  const [user] = await database
    .insert(users)
    .values({
      email,
      normalizedEmail: email.toLowerCase(),
      displayName,
      status: "active",
    })
    .returning();
  return user;
}

async function authorizedContext(
  database: OperationalDatabase,
  subject: string,
  organizationId: string,
): Promise<AuthorizationContext> {
  const state = await resolveAuthorizationState(
    createAuthorizationRepository(database),
    session(subject, organizationId),
  );

  if (state.status !== "authorized") {
    throw new Error(`Expected authorized fixture, received ${state.status}.`);
  }

  return state.context;
}

function session(subject: string, activeOrganizationId: string) {
  return {
    identity: {
      provider: "cmtcommand-development",
      providerSubject: subject,
    },
    activeOrganizationId,
  };
}

async function cleanupTestRows(database: OperationalDatabase): Promise<void> {
  await database.transaction(async (transaction) => {
    await runAuthorizedTestDatabaseCleanup(
      testDatabaseConfig,
      async () => {
        const result = await transaction.execute<{ database_name: string }>(sql`
          select current_database()::text as database_name
        `);
        return result.rows[0]?.database_name;
      },
      async () => {
        await transaction.execute(
          sql`truncate table "office_assignments", "external_identities", "organization_memberships", "users", "offices", "organizations" restart identity restrict`,
        );
      },
    );
  });
}

async function captureDatabaseError(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected database operation to fail.");
}
