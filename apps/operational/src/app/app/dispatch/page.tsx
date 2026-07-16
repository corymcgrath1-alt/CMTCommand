import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import { listTechnicians, listWorkOrders } from "@/server/operational-records/service";
import { listDispatchBoard } from "@/server/dispatch/service";
import { formatOperationalDateTime, occursOnOperationalDate } from "@/server/dispatch/time";
import { addSupportAction, assignPrimaryAction, createAssignmentAction, removeAssignmentTechnicianAction, transitionAssignmentAction } from "../operations/actions";
import { AccessUnavailable, OperationsHeader, ResultNotice } from "../operations/components";

export const dynamic = "force-dynamic";

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ date?: string; office?: string; result?: string }> }) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  const filters = await searchParams;
  const [boardResult, workOrderResult, technicianResult, officeResult] = await Promise.all([
    listDispatchBoard(db, state.context),
    listWorkOrders(db, state.context),
    listTechnicians(db, state.context),
    listAccessibleOffices(db, state.context.tenantScope),
  ]);
  if (boardResult.status !== "ok") return <AccessUnavailable />;
  const workOrders = workOrderResult.status === "ok" ? workOrderResult.values : [];
  const readyWorkOrders = workOrders.filter((workOrder) => workOrder.status === "ready_for_dispatch" && (!filters.office || filters.office === "all" || workOrder.officeId === filters.office) && (!filters.date || occursOnOperationalDate(workOrder.scheduledStartAt, filters.date, workOrder.timeZone)));
  const technicians = technicianResult.status === "ok" ? technicianResult.values.filter((technician) => technician.status === "active") : [];
  const offices = officeResult.status === "ok" ? officeResult.values : [];
  const board = boardResult.values.filter((item) => (!filters.office || filters.office === "all" || item.assignment.officeId === filters.office) && (!filters.date || occursOnOperationalDate(item.assignment.assignmentStartAt, filters.date, item.assignment.timeZone)));
  const canManage = hasPermission(state.context, "dispatch_assignment.manage");
  const canAssign = hasPermission(state.context, "dispatch_assignment.assign");
  const canTransition = hasPermission(state.context, "dispatch_assignment.transition");
  const canOverride = hasPermission(state.context, "dispatch_assignment.conflict_override");

  return <main className="shell operations-shell">
    <OperationsHeader context={state.context} eyebrow="Operational scheduling" title="Dispatch Board" description="Schedule ready work, assign eligible technicians, and apply durable lifecycle transitions." />
    <ResultNotice result={filters.result} />
    <section className="panel stack"><h2>Board date and office</h2><form className="filter-grid" method="get"><label>Operational date<input type="date" name="date" defaultValue={filters.date} /></label><label>Office<select name="office" defaultValue={filters.office ?? "all"}><option value="all">All authorized offices</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.code}</option>)}</select></label><button className="button" type="submit">Refresh board</button></form></section>
    <section className="panel stack" aria-labelledby="unassigned-work"><div className="record-heading"><h2 id="unassigned-work">Ready, unassigned work</h2><span className="status-chip">{readyWorkOrders.length}</span></div>
      {readyWorkOrders.length === 0 ? <p className="muted">No ready work orders match this view.</p> : <div className="record-grid">{readyWorkOrders.map((workOrder) => <article className="subpanel stack" key={workOrder.id}><h3>{workOrder.workOrderNumber}</h3><p>{workOrder.serviceType} · {workOrder.jobSiteName}</p><p className="muted">{formatOperationalDateTime(workOrder.scheduledStartAt, workOrder.timeZone)}</p>{canManage ? <form action={createAssignmentAction}><input type="hidden" name="officeId" value={workOrder.officeId} /><input type="hidden" name="workOrderId" value={workOrder.id} /><input type="hidden" name="sourceAssignmentId" value={`ui-${workOrder.id}`} /><input type="hidden" name="assignmentStartAt" value={workOrder.scheduledStartAt.toISOString()} /><input type="hidden" name="assignmentEndAt" value={workOrder.scheduledEndAt.toISOString()} /><button className="button" type="submit">Create unassigned schedule</button></form> : null}</article>)}</div>}
    </section>
    <section className="dispatch-grid" aria-label="Scheduled assignments">{board.map((item) => <article className="panel stack" key={item.assignment.id}><div className="record-heading"><div><p className="eyebrow">{item.workOrder.workOrderNumber}</p><h2>{item.project.name}</h2></div><span className="status-chip">{item.assignment.status}</span></div>
      <p><strong>{item.workOrder.serviceType}</strong> · {item.workOrder.priority} priority</p><p>{formatOperationalDateTime(item.assignment.assignmentStartAt, item.assignment.timeZone)} to {formatOperationalDateTime(item.assignment.assignmentEndAt, item.assignment.timeZone)}</p>
      <dl className="detail-list"><div><dt>Primary</dt><dd>{item.primaryTechnician?.displayName ?? "Unassigned"}</dd></div><div><dt>Support</dt><dd>{item.supportTechnicians.map((technician) => technician.displayName).join(", ") || "None"}</dd></div><div><dt>Version</dt><dd>{item.assignment.version}</dd></div></dl>
      {canAssign && item.primaryTechnician && !["in_progress","completed","cancelled"].includes(item.assignment.status) ? <form action={removeAssignmentTechnicianAction} className="inline-form"><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="technicianId" value={item.primaryTechnician.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><input type="hidden" name="reason" value="Primary removed by dispatch" /><button className="text-button" type="submit">Remove primary</button></form> : null}
      {canAssign && item.supportTechnicians.length > 0 && !["in_progress","completed","cancelled"].includes(item.assignment.status) ? <ul className="assignment-list">{item.supportTechnicians.map((support) => <li key={support.id}><span>{support.displayName}</span><form action={removeAssignmentTechnicianAction}><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="technicianId" value={support.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><input type="hidden" name="reason" value="Support removed by dispatch" /><button className="text-button" type="submit">Remove support</button></form></li>)}</ul> : null}
      {canAssign && !["completed","cancelled","in_progress"].includes(item.assignment.status) ? <details><summary>{item.primaryTechnician ? "Reassign primary" : "Assign primary"}</summary><form action={assignPrimaryAction} className="form-grid compact-form"><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><label>Technician<select name="technicianId" required>{technicians.filter((technician) => technician.id !== item.primaryTechnician?.id && !item.supportTechnicians.some((support) => support.id === technician.id)).map((technician) => <option key={technician.id} value={technician.id}>{technician.displayName}</option>)}</select></label>{canOverride ? <><label className="check-row"><input type="checkbox" name="overrideConflicts" /> Override a detected overlap</label><label>Override reason<input name="overrideReason" minLength={8} /></label></> : null}<button className="button" type="submit">Save primary</button></form></details> : null}
      {canAssign && !["completed","cancelled"].includes(item.assignment.status) ? <details><summary>Add support technician</summary><form action={addSupportAction} className="form-grid compact-form"><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><label>Technician<select name="technicianId" required>{technicians.filter((technician) => technician.id !== item.primaryTechnician?.id && !item.supportTechnicians.some((support) => support.id === technician.id)).map((technician) => <option key={technician.id} value={technician.id}>{technician.displayName}</option>)}</select></label>{canOverride ? <><label className="check-row"><input type="checkbox" name="overrideConflicts" /> Override overlap</label><label>Override reason<input name="overrideReason" minLength={8} /></label></> : null}<button className="button" type="submit">Add support</button></form></details> : null}
      {canTransition ? <div className="button-row">{nextTransitions(item.assignment.status).map((toStatus) => <form action={transitionAssignmentAction} key={toStatus}><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><input type="hidden" name="toStatus" value={toStatus} />{toStatus === "cancelled" ? <label className="sr-only">Cancellation reason<input name="reason" required defaultValue="Cancelled by dispatch" /></label> : null}<button className={`button ${toStatus === "cancelled" ? "button-danger" : ""}`} type="submit">{toStatus.replaceAll("_", " ")}</button></form>)}</div> : null}
    </article>)}</section>
  </main>;
}

function nextTransitions(status: string) {
  if (status === "assigned") return ["acknowledged", "cancelled"];
  if (status === "acknowledged") return ["in_progress", "cancelled"];
  if (status === "in_progress") return ["completed", "cancelled"];
  if (["draft", "unassigned"].includes(status)) return ["cancelled"];
  return [];
}
