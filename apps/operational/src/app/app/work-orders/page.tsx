import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import { listServiceTypes } from "@/server/operational-records/catalog-service";
import { listDispatchAssignments, listProjects, listWorkOrders } from "@/server/operational-records/service";
import { formatOperationalDateTime, occursOnOperationalDate } from "@/server/dispatch/time";
import { createServiceTypeAction, createWorkOrderAction, transitionWorkOrderAction, updateWorkOrderAction } from "../operations/actions";
import { AccessUnavailable, OperationsHeader, ResultNotice } from "../operations/components";

export const dynamic = "force-dynamic";

type Filters = { office?: string; project?: string; date?: string; priority?: string; status?: string; serviceType?: string; result?: string };

export default async function WorkOrdersPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  const filters = await searchParams;
  const [workOrderResult, projectResult, serviceTypeResult, officeResult, assignmentResult] = await Promise.all([
    listWorkOrders(db, state.context),
    listProjects(db, state.context),
    listServiceTypes(db, state.context),
    listAccessibleOffices(db, state.context.tenantScope),
    listDispatchAssignments(db, state.context),
  ]);
  if (workOrderResult.status !== "ok") return <AccessUnavailable />;
  const projects = projectResult.status === "ok" ? projectResult.values : [];
  const serviceTypes = serviceTypeResult.status === "ok" ? serviceTypeResult.values : [];
  const offices = officeResult.status === "ok" ? officeResult.values : [];
  const assignments = assignmentResult.status === "ok" ? assignmentResult.values : [];
  const values = workOrderResult.values.filter((workOrder) =>
    (!filters.office || filters.office === "all" || workOrder.officeId === filters.office) &&
    (!filters.project || filters.project === "all" || workOrder.projectId === filters.project) &&
    (!filters.priority || filters.priority === "all" || workOrder.priority === filters.priority) &&
    (!filters.status || filters.status === "all" || workOrder.status === filters.status) &&
    (!filters.serviceType || filters.serviceType === "all" || workOrder.serviceTypeId === filters.serviceType) &&
    (!filters.date || occursOnOperationalDate(workOrder.scheduledStartAt, filters.date, workOrder.timeZone)),
  );
  const canManage = hasPermission(state.context, "work_order.manage");
  const canManageServiceTypes = hasPermission(state.context, "service_type.manage");

  return (
    <main className="shell operations-shell">
      <OperationsHeader context={state.context} eyebrow="Intake and queue" title="Work Orders" description="Create durable service requests, prepare them for dispatch, and preserve explicit lifecycle state." />
      <ResultNotice result={filters.result} />
      <section className="panel stack"><h2>Dispatch queue filters</h2><form className="filter-grid" method="get">
        <label>Office<select name="office" defaultValue={filters.office ?? "all"}><option value="all">All offices</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label>
        <label>Project<select name="project" defaultValue={filters.project ?? "all"}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.projectNumber}</option>)}</select></label>
        <label>Requested date<input type="date" name="date" defaultValue={filters.date} /></label>
        <label>Priority<select name="priority" defaultValue={filters.priority ?? "all"}><option value="all">All priorities</option>{["low","normal","high","urgent"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={filters.status ?? "all"}><option value="all">All statuses</option>{["draft","ready_for_dispatch","scheduled","in_progress","completed","cancelled"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Service type<select name="serviceType" defaultValue={filters.serviceType ?? "all"}><option value="all">All service types</option>{serviceTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <button className="button" type="submit">Apply filters</button>
      </form></section>
      {canManageServiceTypes ? <details className="panel stack"><summary>Add service type</summary><form action={createServiceTypeAction} className="form-grid">
        <label>Key<input name="key" required placeholder="concrete_placement" /></label><label>Name<input name="name" required /></label>
        <label>Category<select name="category">{["concrete","soils","masonry","reinforcing_steel","structural_steel","fireproofing","asphalt","other"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <button className="button" type="submit">Create service type</button>
      </form></details> : null}
      {canManage ? <details className="panel stack"><summary>Create work order</summary><form action={createWorkOrderAction} className="form-grid">
        <label>Office<select name="officeId" required>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label>
        <label>Project<select name="projectId" required>{projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.projectNumber} — {project.name}</option>)}</select></label>
        <label>Service type<select name="serviceTypeId" required>{serviceTypes.filter((type) => type.status === "active").map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label>Source ID<input name="sourceWorkOrderId" required /></label><label>Work-order number<input name="workOrderNumber" required /></label><label>Job site<input name="jobSiteName" required /></label>
        <label>Priority<select name="priority" defaultValue="normal">{["low","normal","high","urgent"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Start (ISO with offset)<input name="scheduledStartAt" required placeholder="2026-07-20T08:00:00-04:00" /></label><label>End (ISO with offset)<input name="scheduledEndAt" required placeholder="2026-07-20T12:00:00-04:00" /></label>
        <label className="form-wide">Dispatch instructions<textarea name="dispatchInstructions" rows={3} /></label><button className="button" type="submit">Create draft work order</button>
      </form></details> : null}
      <section className="record-grid" aria-label="Work orders">{values.map((workOrder) => {
        const project = projects.find((value) => value.id === workOrder.projectId);
        const assignmentCount = assignments.filter((value) => value.workOrderId === workOrder.id).length;
        return <article className="panel stack" key={workOrder.id}><div className="record-heading"><div><p className="eyebrow">{workOrder.workOrderNumber}</p><h2>{project?.name ?? workOrder.jobSiteName}</h2></div><span className="status-chip">{workOrder.status}</span></div>
          <p><strong>{workOrder.serviceType}</strong> · {workOrder.priority} priority</p><p>{workOrder.jobSiteName}</p><p className="muted">{formatOperationalDateTime(workOrder.scheduledStartAt, workOrder.timeZone)} to {formatOperationalDateTime(workOrder.scheduledEndAt, workOrder.timeZone)} · {assignmentCount} assignments · version {workOrder.version}</p>
          {canManage && ["draft","ready_for_dispatch"].includes(workOrder.status) ? <details><summary>Edit work order</summary><form action={updateWorkOrderAction} className="form-grid compact-form"><input type="hidden" name="workOrderId" value={workOrder.id} /><input type="hidden" name="expectedVersion" value={workOrder.version} /><label>Project<select name="projectId" defaultValue={workOrder.projectId}>{projects.filter((value) => value.officeId === workOrder.officeId && value.status === "active").map((value) => <option key={value.id} value={value.id}>{value.projectNumber}</option>)}</select></label><label>Service type<select name="serviceTypeId" defaultValue={workOrder.serviceTypeId}>{serviceTypes.filter((value) => value.status === "active" || value.id === workOrder.serviceTypeId).map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label><label>Number<input name="workOrderNumber" defaultValue={workOrder.workOrderNumber} required /></label><label>Job site<input name="jobSiteName" defaultValue={workOrder.jobSiteName} required /></label><label>Priority<select name="priority" defaultValue={workOrder.priority}>{["low","normal","high","urgent"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Start (ISO)<input name="scheduledStartAt" defaultValue={workOrder.scheduledStartAt.toISOString()} required /></label><label>End (ISO)<input name="scheduledEndAt" defaultValue={workOrder.scheduledEndAt.toISOString()} required /></label><label className="form-wide">Instructions<textarea name="dispatchInstructions" defaultValue={workOrder.dispatchInstructions ?? ""} /></label><button className="button" type="submit">Save version {workOrder.version}</button></form></details> : null}
          {canManage && workOrder.status === "draft" ? <form action={transitionWorkOrderAction}><input type="hidden" name="workOrderId" value={workOrder.id} /><input type="hidden" name="expectedVersion" value={workOrder.version} /><input type="hidden" name="toStatus" value="ready_for_dispatch" /><button className="button" type="submit">Mark ready for dispatch</button></form> : null}
          {canManage && !["completed","cancelled"].includes(workOrder.status) ? <details><summary>Cancel work order</summary><form action={transitionWorkOrderAction} className="inline-form"><input type="hidden" name="workOrderId" value={workOrder.id} /><input type="hidden" name="expectedVersion" value={workOrder.version} /><input type="hidden" name="toStatus" value="cancelled" /><label>Reason<input name="reason" required /></label><button className="button button-danger" type="submit">Cancel</button></form></details> : null}
        </article>;
      })}</section>
    </main>
  );
}
