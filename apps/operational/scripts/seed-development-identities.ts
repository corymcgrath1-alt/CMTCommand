import { getServerEnv } from "../src/lib/env/server";
import { closeDatabasePool, getDatabase } from "../src/server/db/client";
import {
  externalIdentities,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  users,
} from "../src/server/db/schema";
import {
  assertDevelopmentIdentitySeedingAllowed,
  developmentIdentityFixtures,
  developmentOffices,
  developmentOrganizations,
} from "../src/server/auth/development-fixtures";
import { DEVELOPMENT_IDENTITY_PROVIDER } from "../src/server/auth/runtime-config";

async function main(): Promise<void> {
  const env = getServerEnv();
  assertDevelopmentIdentitySeedingAllowed(env);

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed development identities.");
  }

  const db = getDatabase(env.DATABASE_URL);

  await db.transaction(async (transaction) => {
    await transaction
      .insert(organizations)
      .values([...developmentOrganizations])
      .onConflictDoNothing();
    await transaction
      .insert(offices)
      .values([...developmentOffices])
      .onConflictDoNothing();

    await transaction
      .insert(users)
      .values(
        developmentIdentityFixtures.map((fixture) => ({
          id: fixture.id,
          email: fixture.email,
          normalizedEmail: fixture.email.toLowerCase(),
          displayName: fixture.displayName,
          status: fixture.userStatus,
        })),
      )
      .onConflictDoNothing();

    const alphaAdmin = developmentIdentityFixtures[0];
    const betaAdmin = developmentIdentityFixtures.find(
      (fixture) => fixture.subject === "beta-admin",
    );

    if (!betaAdmin) {
      throw new Error("Beta administrator fixture is required.");
    }

    const membershipRows = developmentIdentityFixtures.flatMap((fixture) =>
      fixture.memberships.map((membership) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        userId: fixture.id,
        role: membership.role,
        status: membership.status,
        officeAccess: membership.officeAccess,
        createdByUserId:
          membership.organizationId === developmentOrganizations[0].id
            ? alphaAdmin.id
            : betaAdmin.id,
        updatedByUserId:
          membership.organizationId === developmentOrganizations[0].id
            ? alphaAdmin.id
            : betaAdmin.id,
      })),
    );

    await transaction
      .insert(organizationMemberships)
      .values(membershipRows)
      .onConflictDoNothing();
    await transaction
      .insert(externalIdentities)
      .values(
        developmentIdentityFixtures.map((fixture) => ({
          userId: fixture.id,
          provider: DEVELOPMENT_IDENTITY_PROVIDER,
          providerSubject: fixture.subject,
        })),
      )
      .onConflictDoNothing();

    const assignmentRows = developmentIdentityFixtures.flatMap((fixture) =>
      fixture.memberships.flatMap((membership) =>
        membership.officeIds.map((officeId) => ({
          organizationId: membership.organizationId,
          organizationMembershipId: membership.id,
          officeId,
          createdByUserId:
            membership.organizationId === developmentOrganizations[0].id
              ? alphaAdmin.id
              : betaAdmin.id,
        })),
      ),
    );

    if (assignmentRows.length > 0) {
      await transaction
        .insert(officeAssignments)
        .values(assignmentRows)
        .onConflictDoNothing();
    }
  });

  process.stdout.write(
    `Seeded ${developmentIdentityFixtures.length} development identities.\n`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown seed failure";
    process.stderr.write(`Development identity seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });
