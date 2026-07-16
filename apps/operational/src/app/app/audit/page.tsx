import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import {
  listAuditEvents,
  type AuditListItem,
} from "@/server/audit/query-service";
import {
  auditActionValues,
  auditCategoryValues,
  auditOutcomeValues,
  auditTargetTypeValues,
} from "@/server/audit/taxonomy";
import { listAccessibleOffices } from "@/server/tenancy/repository";
import { AccessUnavailable, OperationsHeader } from "../operations/components";

export const dynamic = "force-dynamic";

type AuditSearchParams = {
  from?: string;
  to?: string;
  category?: string;
  action?: string;
  outcome?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  officeId?: string;
  requestId?: string;
  correlationId?: string;
  cursorOccurredAt?: string;
  cursorId?: string;
  pageSize?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const { state, db } = await loadRequestAuthorization();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "authorized" || !db) return <AccessUnavailable />;
  if (!hasPermission(state.context, "audit.read")) {
    return (
      <main className="shell narrow-shell">
        <section className="panel stack">
          <h1>Audit history access unavailable</h1>
          <p className="muted">Your current role does not include general audit-history access.</p>
          <Link className="button" href="/app">Return to operations</Link>
        </section>
      </main>
    );
  }

  const query = await searchParams;
  const [result, officeResult] = await Promise.all([
    listAuditEvents(db, state.context, normalizeAuditQuery(query)),
    listAccessibleOffices(db, state.context.tenantScope),
  ]);
  const offices = officeResult.status === "ok" ? officeResult.values : [];

  return (
    <main className="shell operations-shell">
      <OperationsHeader
        context={state.context}
        eyebrow="Accountability"
        title="Audit history"
        description="Immutable organization history for material operational and security actions."
      />
      <section className="panel stack" aria-labelledby="audit-filters">
        <h2 id="audit-filters">Filter events</h2>
        <form className="filter-grid" method="get">
          <label>From date<input type="date" name="from" defaultValue={query.from} /></label>
          <label>To date<input type="date" name="to" defaultValue={query.to} /></label>
          <label>Category<select name="category" defaultValue={query.category ?? "all"}><option value="all">All authorized categories</option>{auditCategoryValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Action<select name="action" defaultValue={query.action ?? "all"}><option value="all">All actions</option>{auditActionValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Outcome<select name="outcome" defaultValue={query.outcome ?? "all"}><option value="all">All outcomes</option>{auditOutcomeValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Office<select name="officeId" defaultValue={query.officeId ?? "all"}><option value="all">All authorized offices</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.code} — {office.name}</option>)}</select></label>
          <label>Actor ID<input name="actorId" defaultValue={query.actorId} /></label>
          <label>Target type<select name="targetType" defaultValue={query.targetType ?? "all"}><option value="all">All target types</option>{auditTargetTypeValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Target ID<input name="targetId" defaultValue={query.targetId} /></label>
          <label>Request ID<input name="requestId" defaultValue={query.requestId} /></label>
          <label>Correlation ID<input name="correlationId" defaultValue={query.correlationId} /></label>
          <button className="button" type="submit">Apply filters</button>
        </form>
      </section>

      {result.status === "ok" ? (
        result.values.length > 0 ? (
          <>
            <section className="record-grid audit-grid" aria-label="Audit event list">
              {result.values.map((event) => <AuditEventCard key={event.id} event={event} />)}
            </section>
            {result.nextCursor ? (
              <nav className="pagination" aria-label="Audit pagination">
                <Link className="button" href={nextPageHref(query, result.nextCursor)}>Older events</Link>
              </nav>
            ) : null}
          </>
        ) : (
          <section className="panel stack"><h2>No audit events found</h2><p className="muted">No authorized events match the current filters and date range.</p></section>
        )
      ) : (
        <section className="panel stack" role="alert">
          <h2>Audit history unavailable</h2>
          <p className="muted">{result.status === "forbidden" ? "The requested audit category needs stronger permission." : result.status === "validation_error" ? result.issues.join(" ") : "The requested history is unavailable in your current scope."}</p>
        </section>
      )}
    </main>
  );
}

function AuditEventCard({ event }: { event: AuditListItem }) {
  return (
    <article className="panel stack audit-card">
      <div className="record-heading">
        <div><p className="eyebrow">{humanize(event.category)}</p><h2>{humanize(event.action)}</h2></div>
        <span className="status-chip">{humanize(event.outcome)}</span>
      </div>
      <dl className="detail-list">
        <div><dt>Actor</dt><dd>{event.actorDisplayName} · {humanize(event.actorRole)}</dd></div>
        <div><dt>Target</dt><dd>{humanize(event.targetType)} · <span className="audit-id">{event.targetId}</span></dd></div>
        {event.secondaryTargetId ? <div><dt>Related target</dt><dd>{humanize(event.secondaryTargetType ?? "record")} · <span className="audit-id">{event.secondaryTargetId}</span></dd></div> : null}
        <div><dt>Office</dt><dd>{event.officeCode ? `${event.officeCode} — ${event.officeName}` : "Organization-wide"}</dd></div>
        <div><dt>Occurred</dt><dd>{formatAuditTime(event.occurredAt, event.timeZone)}</dd></div>
        {event.reason ? <div><dt>Reason</dt><dd>{event.reason}</dd></div> : null}
        {event.requestId ? <div><dt>Request</dt><dd className="audit-id">{event.requestId}</dd></div> : null}
        {event.correlationId ? <div><dt>Correlation</dt><dd className="audit-id">{event.correlationId}</dd></div> : null}
      </dl>
      {(event.previousState || event.resultingState) ? (
        <div className="audit-state-grid">
          <AuditState title="Previous state" value={event.previousState} />
          <AuditState title="Resulting state" value={event.resultingState} />
        </div>
      ) : null}
    </article>
  );
}

function AuditState({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  if (!value) return <section><h3>{title}</h3><p className="muted">Not recorded</p></section>;
  return (
    <section><h3>{title}</h3><dl className="detail-list compact-list">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd>{formatStateValue(item)}</dd></div>)}</dl></section>
  );
}

function normalizeAuditQuery(query: AuditSearchParams): Record<string, string> {
  const values = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value && value !== "all"),
  ) as Record<string, string>;
  if (query.from) values.from = `${query.from}T00:00:00.000Z`;
  if (query.to) values.to = `${query.to}T23:59:59.999Z`;
  return values;
}

function nextPageHref(
  query: AuditSearchParams,
  cursor: { occurredAt: string; id: string },
): string {
  const values = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value && value !== "all") as [string, string][],
  );
  values.set("cursorOccurredAt", cursor.occurredAt);
  values.set("cursorId", cursor.id);
  return `/app/audit?${values.toString()}`;
}

function humanize(value: string): string {
  return value.replaceAll(".", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStateValue(value: unknown): string {
  if (value === null) return "None";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  return "Structured value";
}

function formatAuditTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
