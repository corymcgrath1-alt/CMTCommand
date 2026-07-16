import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import {
  clearActiveOrganizationAction,
  selectActiveOrganizationAction,
  signOutAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Protected operations",
};

export default async function ProtectedAppPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const { state, db } = await loadRequestAuthorization();
  const { access } = await searchParams;

  if (state.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (
    state.status === "organization_selection_required" ||
    state.status === "organization_selection_invalid"
  ) {
    return (
      <AccessShell title="Choose an organization">
        <p className="muted">
          Select an active membership. The server will revalidate this choice;
          browser-supplied organization scope is never trusted.
        </p>
        {access ? (
          <p className="notice notice-error" role="alert">
            That organization is not available to this identity.
          </p>
        ) : null}
        <div className="selection-list">
          {state.memberships.map((membership) => (
            <form action={selectActiveOrganizationAction} key={membership.id}>
              <input
                name="organizationId"
                type="hidden"
                value={membership.organizationId}
              />
              <button className="selection-button" type="submit">
                <span>{membership.organizationName}</span>
                <small>{formatRole(membership.role)}</small>
              </button>
            </form>
          ))}
        </div>
        <form action={signOutAction}>
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </AccessShell>
    );
  }

  if (state.status !== "authorized" || !db) {
    return <DeniedState status={state.status} />;
  }

  const officesResult = await listAccessibleOffices(db, state.context.tenantScope);
  const officeValues = officesResult.status === "ok" ? officesResult.values : [];
  const context = state.context;

  return (
    <main className="shell" aria-labelledby="operations-title">
      <header className="app-header">
        <div>
          <p className="eyebrow">Protected operational shell</p>
          <h1 id="operations-title">{context.membership.organizationName}</h1>
          <p className="lead">
            Identity, membership, office access, and permissions are resolved
            server-side for every request.
          </p>
        </div>
        <div className="header-actions">
          <form action={clearActiveOrganizationAction}>
            <button className="button button-secondary" type="submit">
              Change organization
            </button>
          </form>
          <form action={signOutAction}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="status-grid" aria-label="Authorized account context">
        <article className="panel stack">
          <div>
            <h2>Account context</h2>
            <dl className="detail-list">
              <div>
                <dt>User</dt>
                <dd>{context.user.displayName || context.user.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{formatRole(context.membership.role)}</dd>
              </div>
              <div>
                <dt>Office policy</dt>
                <dd>
                  {context.tenantScope.officeAccess === "all"
                    ? "All organization offices"
                    : "Assigned offices only"}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="panel stack">
          <div>
            <h2>Authorized offices</h2>
            {officeValues.length > 0 ? (
              <ul className="plain-list">
                {officeValues.map((office) => (
                  <li key={office.id}>
                    <strong>{office.code}</strong> — {office.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No offices are assigned to this membership.</p>
            )}
          </div>
        </article>

        <article className="panel panel-wide stack">
          <div>
            <h2>Foundation capabilities</h2>
            <p className="muted">
              This phase proves identity and access control only. Readiness,
              coverage, assignments, field capture, and reporting remain deferred.
            </p>
          </div>
          {hasPermission(context, "organization.members.read") ? (
            <Link className="button button-link" href="/app/admin/members">
              Manage organization members
            </Link>
          ) : null}
        </article>
      </section>
    </main>
  );
}
function AccessShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="shell narrow-shell" aria-labelledby="access-title">
      <section className="intro">
        <p className="eyebrow">Protected operations</p>
        <h1 id="access-title">{title}</h1>
      </section>
      <section className="panel stack">{children}</section>
    </main>
  );
}

function DeniedState({ status }: { status: string }) {
  const messageByStatus: Record<string, { title: string; detail: string }> = {
    auth_unavailable: {
      title: "Authentication service unavailable",
      detail:
        "Authentication or its database boundary is not configured for this environment.",
    },
    identity_unknown: {
      title: "Identity not provisioned",
      detail: "This verified identity is not mapped to a CMTCommand user.",
    },
    user_denied: {
      title: "Account access denied",
      detail: "This account is not active.",
    },
    no_membership: {
      title: "No organization access",
      detail: "This account has no organization membership.",
    },
    membership_denied: {
      title: "Membership access denied",
      detail: "The selected organization membership is not active.",
    },
    office_policy_invalid: {
      title: "Office access unavailable",
      detail: "The membership office policy is not valid for its role.",
    },
  };
  const content = messageByStatus[status] ?? {
    title: "Access unavailable",
    detail: "The protected application could not establish an authorized context.",
  };

  return (
    <AccessShell title={content.title}>
      <p className="muted">{content.detail}</p>
      <form action={signOutAction}>
        <button className="button button-secondary" type="submit">
          Sign out
        </button>
      </form>
    </AccessShell>
  );
}

function formatRole(role: string): string {
  return role.replaceAll("_", " ");
}
