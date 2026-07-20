import { OperationalNav } from "../operational-nav";
import type { AuthorizationContext } from "@/server/auth/types";

export function OperationsHeader({
  context,
  eyebrow,
  title,
  description,
}: {
  context: AuthorizationContext;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="app-header operations-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </div>
      <OperationalNav context={context} />
    </header>
  );
}

export function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  const successful = ["created", "ok"].includes(result);
  const message: Record<string, string> = {
    created: "Saved successfully.",
    ok: "Update completed.",
    stale_update: "This record changed. Refresh and try again with the latest version.",
    schedule_conflict: "The technician has an overlapping assignment. Review the conflict or use an authorized override with a reason.",
    invalid_transition: "That lifecycle change is not allowed from the current state.",
    forbidden: "Your current role cannot perform that action.",
    not_found_or_inaccessible: "The record is unavailable in your current organization and office scope.",
    inactive_reference: "The selected service type or technician is inactive.",
    validation_error: "Review the form values and try again.",
    conflict: "A record with that durable source identity already exists.",
    persistence_error: "The update could not be saved. No partial workflow change was retained.",
  };
  return (
    <p className={`notice ${successful ? "notice-success" : "notice-error"}`} role={successful ? "status" : "alert"}>
      {message[result] ?? "The request could not be completed."}
    </p>
  );
}

export function AccessUnavailable() {
  return (
    <main className="shell narrow-shell">
      <section className="panel stack">
        <h1>Operational access unavailable</h1>
        <p className="muted">A verified active organization context is required.</p>
      </section>
    </main>
  );
}
