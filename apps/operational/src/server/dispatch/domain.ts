import type {
  AssignmentEventType,
  DispatchAssignmentStatus,
  ProjectStatus,
  WorkOrderStatus,
} from "@/server/db/schema";

const assignmentTransitions: Record<
  DispatchAssignmentStatus,
  readonly DispatchAssignmentStatus[]
> = {
  draft: ["unassigned", "cancelled"],
  unassigned: ["assigned", "cancelled"],
  assigned: ["acknowledged", "unassigned", "cancelled"],
  acknowledged: ["assigned", "in_progress", "unassigned", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const workOrderTransitions: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  draft: ["ready_for_dispatch", "cancelled"],
  ready_for_dispatch: ["scheduled", "cancelled"],
  scheduled: ["ready_for_dispatch", "in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const projectTransitions: Record<ProjectStatus, readonly ProjectStatus[]> = {
  active: ["inactive", "archived"],
  inactive: ["active", "archived"],
  archived: [],
};

export function canTransitionAssignment(
  from: DispatchAssignmentStatus,
  to: DispatchAssignmentStatus,
): boolean {
  return assignmentTransitions[from].includes(to);
}

export function canTransitionWorkOrder(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): boolean {
  return workOrderTransitions[from].includes(to);
}

export function canTransitionProject(from: ProjectStatus, to: ProjectStatus): boolean {
  return from === to || projectTransitions[from].includes(to);
}

export function assignmentEventForTransition(
  to: DispatchAssignmentStatus,
): AssignmentEventType {
  const eventByStatus: Record<DispatchAssignmentStatus, AssignmentEventType> = {
    draft: "created",
    unassigned: "scheduled",
    assigned: "primary_assigned",
    acknowledged: "acknowledged",
    in_progress: "started",
    completed: "completed",
    cancelled: "cancelled",
  };
  return eventByStatus[to];
}

export function intervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
): boolean {
  return firstStart.getTime() < secondEnd.getTime() &&
    firstEnd.getTime() > secondStart.getTime();
}

export function hasConflictOverrideReason(reason: string | null | undefined): boolean {
  return (reason?.trim().length ?? 0) >= 8;
}

export function reconcileWorkOrderStatus(
  current: WorkOrderStatus,
  assignmentStatuses: readonly DispatchAssignmentStatus[],
): WorkOrderStatus {
  if (current === "cancelled" || current === "completed") return current;

  const relevant = assignmentStatuses.filter((status) => status !== "cancelled");
  if (relevant.some((status) => status === "in_progress")) return "in_progress";
  if (relevant.length > 0 && relevant.every((status) => status === "completed")) {
    return "completed";
  }
  if (relevant.length > 0) return "scheduled";
  return current === "draft" ? "draft" : "ready_for_dispatch";
}

export function assignmentIsTerminal(status: DispatchAssignmentStatus): boolean {
  return status === "completed" || status === "cancelled";
}
