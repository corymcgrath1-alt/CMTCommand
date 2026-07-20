import type {
  MembershipStatus,
  OfficeAccessPolicy,
  OrganizationRole,
  UserStatus,
} from "@/server/db/schema";
import type { TenantAccessScope } from "@/server/tenancy/scope";
import type { Permission } from "./permissions";

export type VerifiedExternalIdentity = {
  provider: string;
  providerSubject: string;
};

export type VerifiedSession = {
  identity: VerifiedExternalIdentity;
  activeOrganizationId?: string;
};

export type IdentityUser = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
};

export type MembershipAccessRecord = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationStatus: "active" | "inactive";
  role: OrganizationRole;
  status: MembershipStatus;
  officeAccess: OfficeAccessPolicy;
  officeIds: string[];
};

export type AuthorizationContext = {
  user: IdentityUser & { status: "active" };
  membership: MembershipAccessRecord & { status: "active" };
  permissions: Permission[];
  tenantScope: TenantAccessScope;
};

export type AuthorizationState =
  | { status: "auth_unavailable"; reason: string }
  | { status: "unauthenticated" }
  | { status: "identity_unknown" }
  | {
      status: "user_denied";
      reason: Exclude<UserStatus, "active">;
    }
  | { status: "no_membership" }
  | {
      status: "membership_denied";
      reason: Exclude<MembershipStatus, "active"> | "organization_inactive";
    }
  | {
      status: "organization_selection_required";
      memberships: MembershipAccessRecord[];
    }
  | { status: "organization_selection_invalid"; memberships: MembershipAccessRecord[] }
  | { status: "office_policy_invalid" }
  | { status: "authorized"; context: AuthorizationContext };
