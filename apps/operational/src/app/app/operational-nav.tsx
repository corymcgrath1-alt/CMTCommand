import Link from "next/link";
import { hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";

export function OperationalNav({ context }: { context: AuthorizationContext }) {
  return (
    <nav className="operational-nav" aria-label="Operational navigation">
      <Link href="/app">Overview</Link>
      {hasPermission(context, "project.read") ? <Link href="/app/projects">Projects</Link> : null}
      {hasPermission(context, "work_order.read") ? <Link href="/app/work-orders">Work Orders</Link> : null}
      {hasPermission(context, "technician.read") ? <Link href="/app/technicians">Technicians</Link> : null}
      {hasPermission(context, "dispatch_assignment.read") ? <Link href="/app/dispatch">Dispatch</Link> : null}
      {hasPermission(context, "dispatch_assignment.read_own") ? <Link href="/app/my-assignments">My Assignments</Link> : null}
      {hasPermission(context, "audit.read") ? <Link href="/app/audit">Audit</Link> : null}
    </nav>
  );
}
