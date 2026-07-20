import { redirect } from "next/navigation";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listMyAssignments } from "@/server/dispatch/service";
import { formatOperationalDateTime } from "@/server/dispatch/time";
import { acknowledgeOwnAssignmentAction } from "../operations/actions";
import { AccessUnavailable, OperationsHeader, ResultNotice } from "../operations/components";
import { AssignmentMediaPanel } from "./media-upload-panel";

export const dynamic = "force-dynamic";

export default async function MyAssignmentsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  const query = await searchParams;
  const result = await listMyAssignments(db, state.context);
  if (result.status !== "ok") return <AccessUnavailable />;

  return <main className="shell operations-shell">
    <OperationsHeader context={state.context} eyebrow="Field technician" title="My Assignments" description="Your linked dispatch assignments and authorized private media." />
    <ResultNotice result={query.result} />
    <section className="record-grid" aria-label="My assignments">{result.values.map((item) => <article className="panel stack" key={item.assignment.id}>
      <div className="record-heading"><div><p className="eyebrow">{item.workOrder.workOrderNumber}</p><h2>{item.project.name}</h2></div><span className="status-chip">{item.assignment.status}</span></div>
      <p>{item.project.address ?? item.workOrder.jobSiteName}</p><p><strong>{item.workOrder.serviceType}</strong></p><p>{formatOperationalDateTime(item.assignment.assignmentStartAt, item.assignment.timeZone)} to {formatOperationalDateTime(item.assignment.assignmentEndAt, item.assignment.timeZone)}</p>
      {item.workOrder.dispatchInstructions ? <section className="subpanel"><h3>Dispatch instructions</h3><p>{item.workOrder.dispatchInstructions}</p></section> : null}
      {item.assignment.status === "assigned" ? <form action={acknowledgeOwnAssignmentAction}><input type="hidden" name="assignmentId" value={item.assignment.id} /><input type="hidden" name="expectedVersion" value={item.assignment.version} /><button className="button" type="submit">Acknowledge assignment</button></form> : null}
      <AssignmentMediaPanel assignmentId={item.assignment.id} />
      <details><summary>Status history</summary><ol className="timeline">{item.history.map((event) => <li key={event.id}><strong>{event.eventType.replaceAll("_", " ")}</strong><span>{formatOperationalDateTime(event.occurredAt, item.assignment.timeZone)}</span></li>)}</ol></details>
    </article>)}</section>
    {result.values.length === 0 ? <section className="panel"><p className="muted">No assignments are linked to your active technician profile in an authorized office.</p></section> : null}
  </main>;
}
