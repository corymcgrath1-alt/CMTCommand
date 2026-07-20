import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import { listTechnicians } from "@/server/operational-records/service";
import { listTechnicianEligibilities } from "@/server/operational-records/catalog-service";
import { listDispatchBoard } from "@/server/dispatch/service";
import { createTechnicianAction, updateTechnicianAction, addTechnicianEligibilityAction } from "../operations/actions";
import { AccessUnavailable, OperationsHeader, ResultNotice } from "../operations/components";

export const dynamic = "force-dynamic";

export default async function TechniciansPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; office?: string; result?: string }> }) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  const filters = await searchParams;
  const [technicianResult, officeResult, boardResult] = await Promise.all([
    listTechnicians(db, state.context),
    listAccessibleOffices(db, state.context.tenantScope),
    listDispatchBoard(db, state.context),
  ]);
  if (technicianResult.status !== "ok") return <AccessUnavailable />;
  const offices = officeResult.status === "ok" ? officeResult.values : [];
  const board = boardResult.status === "ok" ? boardResult.values : [];
  const eligibilityPairs = await Promise.all(technicianResult.values.map(async (technician) => {
    const result = await listTechnicianEligibilities(db, state.context, technician.id);
    return [technician.id, result.status === "ok" ? result.values : []] as const;
  }));
  const eligibilityByTechnician = new Map(eligibilityPairs);
  const q = filters.q?.toLowerCase().trim() ?? "";
  const values = technicianResult.values.filter((technician) =>
    (!q || `${technician.displayName} ${technician.operationalRole ?? ""}`.toLowerCase().includes(q)) &&
    (!filters.status || filters.status === "all" || technician.status === filters.status) &&
    (!filters.office || filters.office === "all" || eligibilityByTechnician.get(technician.id)?.some((eligibility) => eligibility.officeId === filters.office)),
  );
  const canManage = hasPermission(state.context, "technician.manage");

  return <main className="shell operations-shell">
    <OperationsHeader context={state.context} eyebrow="Dispatch resources" title="Technicians" description="Manage work profiles and office eligibility separately from application authorization." />
    <ResultNotice result={filters.result} />
    <section className="panel stack"><h2>Technician filters</h2><form className="filter-grid" method="get">
      <label>Search<input name="q" defaultValue={filters.q} /></label><label>Status<select name="status" defaultValue={filters.status ?? "all"}><option value="all">All</option>{["active","inactive","on_leave"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Eligible office<select name="office" defaultValue={filters.office ?? "all"}><option value="all">All</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label><button className="button" type="submit">Apply filters</button>
    </form></section>
    {canManage ? <details className="panel stack"><summary>Create technician</summary><form action={createTechnicianAction} className="form-grid">
      <label>Home office<select name="officeId" required>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label><label>Source ID<input name="sourceTechnicianId" required /></label><label>Name<input name="displayName" required /></label><label>Operational role<input name="operationalRole" /></label><label>Work email<input type="email" name="workEmail" /></label><label>Field-tech membership ID<input name="organizationMembershipId" /></label><button className="button" type="submit">Create technician</button>
    </form></details> : null}
    <section className="record-grid" aria-label="Technicians">{values.map((technician) => {
      const eligibility = eligibilityByTechnician.get(technician.id) ?? [];
      const scheduledCount = board.filter((item) => item.primaryTechnician?.id === technician.id || item.supportTechnicians.some((support) => support.id === technician.id)).length;
      return <article className="panel stack" key={technician.id}><div className="record-heading"><div><p className="eyebrow">{technician.operationalRole ?? "Technician"}</p><h2>{technician.displayName}</h2></div><span className="status-chip">{technician.status}</span></div>
        <dl className="detail-list"><div><dt>Home office</dt><dd>{offices.find((office) => office.id === technician.homeOfficeId)?.code ?? "Unavailable"}</dd></div><div><dt>Eligible offices</dt><dd>{eligibility.map((item) => offices.find((office) => office.id === item.officeId)?.code).filter(Boolean).join(", ") || "None"}</dd></div><div><dt>Linked login</dt><dd>{technician.organizationMembershipId ? "Linked" : "Not linked"}</dd></div><div><dt>Scheduled assignments</dt><dd>{scheduledCount}{scheduledCount > 1 ? " — review possible overlap" : ""}</dd></div></dl>
        {canManage ? <><details><summary>Edit work profile</summary><form action={updateTechnicianAction} className="form-grid compact-form"><input type="hidden" name="technicianId" value={technician.id} /><input type="hidden" name="expectedVersion" value={technician.version} />
          <label>Home office<select name="officeId" defaultValue={technician.homeOfficeId}>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label><label>Name<input name="displayName" defaultValue={technician.displayName} required /></label><label>Role<input name="operationalRole" defaultValue={technician.operationalRole ?? ""} /></label><label>Email<input name="workEmail" defaultValue={technician.workEmail ?? ""} /></label><label>Phone<input name="workPhone" defaultValue={technician.workPhone ?? ""} /></label><label>Membership ID<input name="organizationMembershipId" defaultValue={technician.organizationMembershipId ?? ""} /></label><label>Status<select name="status" defaultValue={technician.status}>{["active","inactive","on_leave"].map((value) => <option key={value}>{value}</option>)}</select></label><button className="button" type="submit">Save version {technician.version}</button>
        </form></details><details><summary>Add eligible office</summary><form action={addTechnicianEligibilityAction} className="inline-form"><input type="hidden" name="technicianId" value={technician.id} /><label>Office<select name="officeId">{offices.filter((office) => !eligibility.some((item) => item.officeId === office.id)).map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label><button className="button" type="submit">Add eligibility</button></form></details></> : null}
      </article>;
    })}</section>
  </main>;
}
