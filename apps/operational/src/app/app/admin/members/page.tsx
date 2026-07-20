import type { Metadata } from "next";
import Link from "next/link";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { organizationRoleValues, membershipStatusValues } from "@/server/db/schema";
import { listOrganizationMembers } from "@/server/members/service";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import {
  assignOfficeAction,
  changeMembershipRoleAction,
  changeMembershipStatusAction,
  changeOfficeAccessAction,
  prepareMembershipAction,
  removeOfficeAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Member administration",
};

const resultMessages: Record<string, string> = {
  ok: "The membership change was applied.",
  conflict: "The requested membership or office assignment already exists.",
  final_admin: "The final active organization admin cannot be removed or demoted.",
  forbidden: "You do not have permission to make that change.",
  invalid_transition: "That membership status transition is not allowed.",
  not_found_or_inaccessible: "The requested record was not found or is inaccessible.",
  persistence_error: "The change could not be persisted.",
  stale_update: "The membership changed since this page loaded. Review and try again.",
  validation_error: "The submitted membership values are not valid.",
};

export default async function MemberAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { state, db } = await loadRequestAuthorization();
  const { result } = await searchParams;

  if (
    state.status !== "authorized" ||
    !db ||
    !hasPermission(state.context, "organization.members.read")
  ) {
    return (
      <main className="shell narrow-shell" aria-labelledby="access-denied-title">
        <section className="panel stack">
          <p className="eyebrow">Protected operations</p>
          <h1 id="access-denied-title">Permission required</h1>
          <p className="muted">
            Member administration is limited to authorized organization
            administrators.
          </p>
          <Link href="/app">Return to operations</Link>
        </section>
      </main>
    );
  }

  const [members, officesResult] = await Promise.all([
    listOrganizationMembers(db, state.context),
    listAccessibleOffices(db, state.context.tenantScope),
  ]);
  const offices = officesResult.status === "ok" ? officesResult.values : [];

  return (
    <main className="shell" aria-labelledby="member-admin-title">
      <header className="app-header">
        <div>
          <p className="eyebrow">Organization administration</p>
          <h1 id="member-admin-title">Members</h1>
          <p className="lead">{state.context.membership.organizationName}</p>
        </div>
        <Link href="/app">Return to operations</Link>
      </header>

      {result && resultMessages[result] ? (
        <p
          className={`notice ${result === "ok" ? "notice-success" : "notice-error"}`}
          role="status"
        >
          {resultMessages[result]}
        </p>
      ) : null}

      <section className="panel stack" aria-labelledby="prepare-member-title">
        <div>
          <h2 id="prepare-member-title">Prepare a membership</h2>
          <p className="muted">
            This creates an invited user and membership record. No invitation
            email is sent, and no production identity is provisioned.
          </p>
        </div>
        <form action={prepareMembershipAction} className="admin-form-grid">
          <label>
            Display name
            <input name="displayName" required maxLength={160} />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={254} />
          </label>
          <label>
            Role
            <select name="role" defaultValue="dispatcher">
              {organizationRoleValues.map((role) => (
                <option key={role} value={role}>
                  {formatValue(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Office access
            <select name="officeAccess" defaultValue="restricted">
              <option value="restricted">Assigned offices only</option>
              <option value="all">All organization offices</option>
            </select>
          </label>
          <fieldset className="form-full">
            <legend>Initial office assignments</legend>
            <div className="checkbox-grid">
              {offices.map((office) => (
                <label key={office.id} className="checkbox-label">
                  <input name="officeIds" type="checkbox" value={office.id} />
                  {office.code} — {office.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="button form-full" type="submit">
            Prepare membership
          </button>
        </form>
      </section>

      <section className="member-list" aria-label="Organization members">
        {(members ?? []).map((member) => (
          <article className="panel member-card stack" key={member.membershipId}>
            <div className="member-heading">
              <div>
                <h2>{member.displayName}</h2>
                <p className="muted">{member.email}</p>
              </div>
              <span className="badge">{formatValue(member.status)}</span>
            </div>

            <div className="member-controls">
              <form action={changeMembershipRoleAction} className="inline-form">
                <MemberVersionFields member={member} />
                <label>
                  Role
                  <select name="role" defaultValue={member.role}>
                    {organizationRoleValues.map((role) => (
                      <option key={role} value={role}>
                        {formatValue(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-small" type="submit">
                  Update role
                </button>
              </form>

              <form action={changeMembershipStatusAction} className="inline-form">
                <MemberVersionFields member={member} />
                <label>
                  Status
                  <select name="status" defaultValue={member.status}>
                    {membershipStatusValues.map((status) => (
                      <option key={status} value={status}>
                        {formatValue(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-small" type="submit">
                  Update status
                </button>
              </form>

              <form action={changeOfficeAccessAction} className="inline-form">
                <MemberVersionFields member={member} />
                <label>
                  Office policy
                  <select name="officeAccess" defaultValue={member.officeAccess}>
                    <option value="restricted">Assigned only</option>
                    <option value="all">All offices</option>
                  </select>
                </label>
                <button className="button button-small" type="submit">
                  Update policy
                </button>
              </form>
            </div>

            <div>
              <h3>Office assignments</h3>
              {member.offices.length > 0 ? (
                <ul className="assignment-list">
                  {member.offices.map((office) => (
                    <li key={office.id}>
                      <span>
                        {office.code} — {office.name}
                      </span>
                      <form action={removeOfficeAction}>
                        <input
                          name="membershipId"
                          type="hidden"
                          value={member.membershipId}
                        />
                        <input name="officeId" type="hidden" value={office.id} />
                        <button className="text-button" type="submit">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No explicit office assignments.</p>
              )}
              <form action={assignOfficeAction} className="inline-form">
                <input
                  name="membershipId"
                  type="hidden"
                  value={member.membershipId}
                />
                <label>
                  Assign office
                  <select name="officeId" required defaultValue="">
                    <option value="" disabled>
                      Select an office
                    </option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.code} — {office.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-small" type="submit">
                  Assign
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
function MemberVersionFields({
  member,
}: {
  member: { membershipId: string; version: number };
}) {
  return (
    <>
      <input name="membershipId" type="hidden" value={member.membershipId} />
      <input name="expectedVersion" type="hidden" value={member.version} />
    </>
  );
}

function formatValue(value: string): string {
  return value.replaceAll("_", " ");
}
