import { and, eq } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  externalIdentities,
  officeAssignments,
  organizationMemberships,
  organizations,
  users,
} from "@/server/db/schema";
import type {
  IdentityUser,
  MembershipAccessRecord,
  VerifiedExternalIdentity,
} from "./types";

export type AuthorizationRepository = {
  findUserByVerifiedIdentity(
    identity: VerifiedExternalIdentity,
  ): Promise<IdentityUser | null>;
  listMembershipsForUser(userId: string): Promise<MembershipAccessRecord[]>;
};

export function createAuthorizationRepository(
  db: OperationalDatabase,
): AuthorizationRepository {
  return {
    async findUserByVerifiedIdentity(identity) {
      const [record] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          status: users.status,
        })
        .from(externalIdentities)
        .innerJoin(users, eq(externalIdentities.userId, users.id))
        .where(
          and(
            eq(externalIdentities.provider, identity.provider),
            eq(externalIdentities.providerSubject, identity.providerSubject),
          ),
        )
        .limit(1);

      return record ?? null;
    },

    async listMembershipsForUser(userId) {
      const membershipRows = await db
        .select({
          id: organizationMemberships.id,
          organizationId: organizationMemberships.organizationId,
          organizationName: organizations.name,
          organizationStatus: organizations.status,
          role: organizationMemberships.role,
          status: organizationMemberships.status,
          officeAccess: organizationMemberships.officeAccess,
        })
        .from(organizationMemberships)
        .innerJoin(
          organizations,
          eq(organizationMemberships.organizationId, organizations.id),
        )
        .where(eq(organizationMemberships.userId, userId))
        .orderBy(organizations.name);

      if (membershipRows.length === 0) {
        return [];
      }

      const assignmentRows = await db
        .select({
          organizationMembershipId:
            officeAssignments.organizationMembershipId,
          officeId: officeAssignments.officeId,
        })
        .from(officeAssignments)
        .innerJoin(
          organizationMemberships,
          eq(
            officeAssignments.organizationMembershipId,
            organizationMemberships.id,
          ),
        )
        .where(eq(organizationMemberships.userId, userId));

      const officeIdsByMembership = new Map<string, string[]>();

      for (const assignment of assignmentRows) {
        const officeIds =
          officeIdsByMembership.get(assignment.organizationMembershipId) ?? [];
        officeIds.push(assignment.officeId);
        officeIdsByMembership.set(assignment.organizationMembershipId, officeIds);
      }

      return membershipRows.map((membership) => ({
        ...membership,
        officeIds: officeIdsByMembership.get(membership.id) ?? [],
      }));
    },
  };
}
