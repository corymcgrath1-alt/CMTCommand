import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import { listProjects, listWorkOrders } from "@/server/operational-records/service";
import { createProjectAction, updateProjectAction } from "../operations/actions";
import { AccessUnavailable, OperationsHeader, ResultNotice } from "../operations/components";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; result?: string }> }) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  const query = await searchParams;
  const [projectResult, workOrderResult, officeResult] = await Promise.all([
    listProjects(db, state.context),
    listWorkOrders(db, state.context),
    listAccessibleOffices(db, state.context.tenantScope),
  ]);
  if (projectResult.status !== "ok") return <AccessUnavailable />;
  const q = query.q?.trim().toLowerCase() ?? "";
  const values = projectResult.values.filter((project) =>
    (!q || `${project.projectNumber} ${project.name} ${project.address ?? ""}`.toLowerCase().includes(q)) &&
    (!query.status || query.status === "all" || project.status === query.status),
  );
  const offices = officeResult.status === "ok" ? officeResult.values : [];
  const workOrders = workOrderResult.status === "ok" ? workOrderResult.values : [];
  const canManage = hasPermission(state.context, "project.manage");

  return (
    <main className="shell operations-shell">
      <OperationsHeader context={state.context} eyebrow="Operational records" title="Projects" description="Manage authorized-office projects without deleting their operational history." />
      <ResultNotice result={query.result} />
      <section className="panel stack" aria-labelledby="project-filters">
        <h2 id="project-filters">Find projects</h2>
        <form className="filter-grid" method="get">
          <label>Search<input name="q" defaultValue={query.q} placeholder="Number, name, or address" /></label>
          <label>Status<select name="status" defaultValue={query.status ?? "all"}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
          <button className="button" type="submit">Apply filters</button>
        </form>
      </section>
      {canManage ? (
        <details className="panel stack">
          <summary>Create project</summary>
          <form action={createProjectAction} className="form-grid">
            <label>Office<select name="officeId" required>{offices.map((office) => <option key={office.id} value={office.id}>{office.code} — {office.name}</option>)}</select></label>
            <label>Source ID<input name="sourceProjectId" required /></label>
            <label>Project number<input name="projectNumber" required /></label>
            <label>Project name<input name="name" required /></label>
            <label className="form-wide">Address<input name="address" /></label>
            <button className="button" type="submit">Create project</button>
          </form>
        </details>
      ) : null}
      <section className="record-grid" aria-label="Project list">
        {values.map((project) => (
          <article className="panel stack" key={project.id}>
            <div className="record-heading"><div><p className="eyebrow">{project.projectNumber}</p><h2>{project.name}</h2></div><span className="status-chip">{project.status}</span></div>
            <p>{project.address ?? "No address recorded"}</p>
            <p className="muted">{workOrders.filter((workOrder) => workOrder.projectId === project.id).length} work orders · version {project.version}</p>
            {canManage ? (
              <details>
                <summary>Edit project</summary>
                <form action={updateProjectAction} className="form-grid compact-form">
                  <input name="projectId" type="hidden" value={project.id} /><input name="expectedVersion" type="hidden" value={project.version} />
                  <label>Office<select name="officeId" defaultValue={project.officeId}>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label>
                  <label>Number<input name="projectNumber" defaultValue={project.projectNumber} required /></label>
                  <label>Name<input name="name" defaultValue={project.name} required /></label>
                  <label>Address<input name="address" defaultValue={project.address ?? ""} /></label>
                  <label>Status<select name="status" defaultValue={project.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
                  <button className="button" type="submit">Save version {project.version}</button>
                </form>
              </details>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
