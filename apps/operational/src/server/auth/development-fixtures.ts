import type {
  MembershipStatus,
  OfficeAccessPolicy,
  OrganizationRole,
  UserStatus,
} from "@/server/db/schema";
import type { ServerEnv } from "@/lib/env/server";

export const developmentOrganizations = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "alpha-engineering",
    name: "Alpha Engineering",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "beta-testing",
    name: "Beta Testing",
  },
] as const;

export const developmentOffices = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    organizationId: developmentOrganizations[0].id,
    code: "ALX",
    name: "Alexandria",
    timeZone: "America/New_York",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    organizationId: developmentOrganizations[0].id,
    code: "RIC",
    name: "Richmond",
    timeZone: "America/New_York",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    organizationId: developmentOrganizations[1].id,
    code: "FFX",
    name: "Fairfax",
    timeZone: "America/New_York",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    organizationId: developmentOrganizations[1].id,
    code: "MNS",
    name: "Manassas",
    timeZone: "America/New_York",
  },
] as const;

type DevelopmentIdentityFixture = {
  id: string;
  subject: string;
  email: string;
  displayName: string;
  userStatus: UserStatus;
  memberships: {
    id: string;
    organizationId: string;
    role: OrganizationRole;
    status: MembershipStatus;
    officeAccess: OfficeAccessPolicy;
    officeIds: string[];
  }[];
};

export const developmentIdentityFixtures: DevelopmentIdentityFixture[] = [
  fixture(1, "alpha-admin", "Alpha Admin", "organization_admin", "all"),
  fixture(2, "alpha-operations", "Alpha Operations", "operations_manager", "restricted", [
    developmentOffices[0].id,
  ]),
  fixture(3, "alpha-dispatcher", "Alpha Dispatcher", "dispatcher", "restricted", [
    developmentOffices[0].id,
  ]),
  fixture(4, "alpha-reviewer", "Alpha Reviewer", "technical_reviewer", "all"),
  fixture(5, "alpha-technician", "Alpha Technician", "field_technician", "restricted", [
    developmentOffices[0].id,
  ]),
  fixture(6, "alpha-viewer", "Alpha Viewer", "viewer", "all"),
  {
    ...fixture(7, "alpha-suspended", "Alpha Suspended", "viewer", "all"),
    memberships: [
      {
        ...fixture(7, "alpha-suspended", "Alpha Suspended", "viewer", "all")
          .memberships[0],
        status: "suspended",
      },
    ],
  },
  {
    ...fixture(8, "alpha-disabled", "Alpha Disabled", "viewer", "all"),
    userStatus: "disabled",
  },
  {
    id: userId(9),
    subject: "no-membership",
    email: "no-membership@example.test",
    displayName: "No Membership",
    userStatus: "active",
    memberships: [],
  },
  {
    ...fixture(10, "beta-admin", "Beta Admin", "organization_admin", "all"),
    memberships: [
      {
        id: membershipId(10),
        organizationId: developmentOrganizations[1].id,
        role: "organization_admin",
        status: "active",
        officeAccess: "all",
        officeIds: [],
      },
    ],
  },
  {
    ...fixture(11, "multi-organization-viewer", "Multi Organization Viewer", "viewer", "all"),
    memberships: [
      fixture(11, "multi-organization-viewer", "Multi Organization Viewer", "viewer", "all")
        .memberships[0],
      {
        id: membershipId(12),
        organizationId: developmentOrganizations[1].id,
        role: "viewer",
        status: "active",
        officeAccess: "all",
        officeIds: [],
      },
    ],
  },
  {
    ...fixture(12, "beta-dispatcher", "Beta Dispatcher", "dispatcher", "restricted"),
    memberships: [
      {
        id: membershipId(13),
        organizationId: developmentOrganizations[1].id,
        role: "dispatcher",
        status: "active",
        officeAccess: "restricted",
        officeIds: [developmentOffices[2].id],
      },
    ],
  },
];

export function assertDevelopmentIdentitySeedingAllowed(env: ServerEnv): void {
  if (
    !["development", "test"].includes(env.APP_ENV) ||
    env.NODE_ENV === "production"
  ) {
    throw new Error(
      "Development identity fixtures are forbidden outside development and test runtimes.",
    );
  }
}

function fixture(
  number: number,
  subject: string,
  displayName: string,
  role: OrganizationRole,
  officeAccess: OfficeAccessPolicy,
  officeIds: string[] = [],
): DevelopmentIdentityFixture {
  return {
    id: userId(number),
    subject,
    email: `${subject}@example.test`,
    displayName,
    userStatus: "active",
    memberships: [
      {
        id: membershipId(number),
        organizationId: developmentOrganizations[0].id,
        role,
        status: "active",
        officeAccess,
        officeIds,
      },
    ],
  };
}

function userId(number: number): string {
  return `30000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function membershipId(number: number): string {
  return `40000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}
