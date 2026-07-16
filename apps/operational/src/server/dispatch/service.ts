import {
  and,
  eq,
  inArray,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { canAccessOffice, hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import { createAuditRequestContext, type AuditRequestContext } from "@/server/audit/request-context";
import { assignmentAuditState, workOrderAuditState } from "@/server/audit/serializers";
import { appendAuditEvent, appendDeniedAuditEvent } from "@/server/audit/writer";
import type { OperationalDatabase } from "@/server/db/client";
import {
  assignmentEvents,
  assignmentTechnicians,
  dispatchAssignments,
  projects,
  technicianOfficeEligibilities,
  technicians,
  workOrders,
  type AssignmentEventRecord,
  type AuditEventRecord,
  type DispatchAssignmentRecord,
  type DispatchAssignmentStatus,
  type WorkOrderRecord,
} from "@/server/db/schema";
import {
  createMutationMetadata,
  forbidden,
  notFoundOrInaccessible,
  persistenceFailure,
  type OperationalRecordFailure,
  type OperationalRecordListResult,
  type OperationalRecordMutationResult,
} from "@/server/operational-records/results";
import {
  lockOperationalOrganization,
  revalidateOperationalActor,
  type OperationalTransaction,
} from "@/server/operational-records/mutation-context";
import { operationalRecordScopePredicate } from "@/server/operational-records/scope";
import { validationIssues } from "@/server/tenancy/validation";
import {
  assignmentEventForTransition,
  canTransitionAssignment,
  canTransitionWorkOrder,
  hasConflictOverrideReason,
  reconcileWorkOrderStatus,
} from "./domain";
import {
  assignTechnicianInputSchema,
  assignmentTransitionInputSchema,
  removeAssignmentTechnicianInputSchema,
  updateAssignmentScheduleInputSchema,
  workOrderTransitionInputSchema,
} from "./validation";

export type ScheduleConflict =
  | { redacted: true }
  | {
      redacted: false;
      assignmentId: string;
      officeId: string;
      workOrderNumber: string;
      assignmentStartAt: Date;
      assignmentEndAt: Date;
      status: DispatchAssignmentStatus;
    };

export type DispatchWorkflowMutationResult<T> =
  | OperationalRecordMutationResult<T>
  | { status: "schedule_conflict"; conflicts: ScheduleConflict[] };

export type DispatchBoardItem = {
  assignment: DispatchAssignmentRecord;
  workOrder: Pick<
    WorkOrderRecord,
    | "id"
    | "workOrderNumber"
    | "jobSiteName"
    | "serviceType"
    | "priority"
    | "status"
    | "dispatchInstructions"
  >;
  project: { id: string; projectNumber: string; name: string; address: string | null };
  primaryTechnician: { id: string; displayName: string } | null;
  supportTechnicians: { id: string; displayName: string }[];
};

export type MyAssignmentItem = DispatchBoardItem & {
  history: AssignmentEventRecord[];
};

export async function listDispatchBoard(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<DispatchBoardItem>> {
  if (!hasPermission(context, "dispatch_assignment.read")) return forbidden();

  try {
    const rows = await db
      .select({
        assignment: dispatchAssignments,
        workOrder: {
          id: workOrders.id,
          workOrderNumber: workOrders.workOrderNumber,
          jobSiteName: workOrders.jobSiteName,
          serviceType: workOrders.serviceType,
          priority: workOrders.priority,
          status: workOrders.status,
          dispatchInstructions: workOrders.dispatchInstructions,
        },
        project: {
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          address: projects.address,
        },
      })
      .from(dispatchAssignments)
      .innerJoin(
        workOrders,
        and(
          eq(dispatchAssignments.workOrderId, workOrders.id),
          eq(dispatchAssignments.organizationId, workOrders.organizationId),
          eq(dispatchAssignments.officeId, workOrders.officeId),
        ),
      )
      .innerJoin(
        projects,
        and(
          eq(workOrders.projectId, projects.id),
          eq(workOrders.organizationId, projects.organizationId),
          eq(workOrders.officeId, projects.officeId),
        ),
      )
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          dispatchAssignments.organizationId,
          dispatchAssignments.officeId,
        ),
      )
      .orderBy(dispatchAssignments.assignmentStartAt, workOrders.workOrderNumber);

    return { status: "ok", values: await addTechnicianRelationships(db, rows) };
  } catch {
    return persistenceFailure();
  }
}

export async function listMyAssignments(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<MyAssignmentItem>> {
  if (!hasPermission(context, "dispatch_assignment.read_own")) return forbidden();

  try {
    const rows = await db
      .select({
        assignment: dispatchAssignments,
        workOrder: {
          id: workOrders.id,
          workOrderNumber: workOrders.workOrderNumber,
          jobSiteName: workOrders.jobSiteName,
          serviceType: workOrders.serviceType,
          priority: workOrders.priority,
          status: workOrders.status,
          dispatchInstructions: workOrders.dispatchInstructions,
        },
        project: {
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          address: projects.address,
        },
      })
      .from(assignmentTechnicians)
      .innerJoin(
        technicians,
        and(
          eq(assignmentTechnicians.technicianId, technicians.id),
          eq(assignmentTechnicians.organizationId, technicians.organizationId),
        ),
      )
      .innerJoin(
        dispatchAssignments,
        and(
          eq(assignmentTechnicians.dispatchAssignmentId, dispatchAssignments.id),
          eq(assignmentTechnicians.organizationId, dispatchAssignments.organizationId),
          eq(assignmentTechnicians.officeId, dispatchAssignments.officeId),
        ),
      )
      .innerJoin(
        workOrders,
        and(
          eq(dispatchAssignments.workOrderId, workOrders.id),
          eq(dispatchAssignments.organizationId, workOrders.organizationId),
          eq(dispatchAssignments.officeId, workOrders.officeId),
        ),
      )
      .innerJoin(
        projects,
        and(
          eq(workOrders.projectId, projects.id),
          eq(workOrders.organizationId, projects.organizationId),
          eq(workOrders.officeId, projects.officeId),
        ),
      )
      .where(
        and(
          eq(technicians.organizationMembershipId, context.membership.id),
          operationalRecordScopePredicate(
            context.tenantScope,
            dispatchAssignments.organizationId,
            dispatchAssignments.officeId,
          ),
        ),
      )
      .orderBy(dispatchAssignments.assignmentStartAt, workOrders.workOrderNumber);

    const uniqueRows = [...new Map(rows.map((row) => [row.assignment.id, row])).values()];
    const withTechnicians = await addTechnicianRelationships(db, uniqueRows);
    const assignmentIds = withTechnicians.map((item) => item.assignment.id);
    const history = assignmentIds.length
      ? await db
          .select()
          .from(assignmentEvents)
          .where(
            and(
              eq(assignmentEvents.organizationId, context.membership.organizationId),
              inArray(assignmentEvents.dispatchAssignmentId, assignmentIds),
            ),
          )
          .orderBy(assignmentEvents.occurredAt, assignmentEvents.assignmentVersion)
      : [];

    return {
      status: "ok",
      values: withTechnicians.map((item) => ({
        ...item,
        history: history.filter(
          (event) => event.dispatchAssignmentId === item.assignment.id,
        ),
      })),
    };
  } catch {
    return persistenceFailure();
  }
}

export async function transitionWorkOrder(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordMutationResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.manage")) return forbidden();
  const parsed = workOrderTransitionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const [current] = await transaction
        .select()
        .from(workOrders)
        .where(
          and(
            operationalRecordScopePredicate(
              context.tenantScope,
              workOrders.organizationId,
              workOrders.officeId,
            ),
            eq(workOrders.id, parsed.data.workOrderId),
          ),
        )
        .limit(1);
      if (!current) return notFoundOrInaccessible();
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "work_order.manage",
        current.officeId,
      );
      if (actorFailure) return actorFailure;
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (
        !canTransitionWorkOrder(current.status, parsed.data.toStatus) ||
        !["ready_for_dispatch", "cancelled"].includes(parsed.data.toStatus)
      ) {
        return { status: "invalid_transition" };
      }
      if (parsed.data.toStatus === "cancelled" && !parsed.data.reason) {
        return {
          status: "validation_error",
          issues: ["reason: cancellation reason is required"],
        };
      }

      const [value] = await transaction
        .update(workOrders)
        .set({
          status: parsed.data.toStatus,
          cancellationReason:
            parsed.data.toStatus === "cancelled" ? parsed.data.reason : null,
          isActive: parsed.data.toStatus !== "cancelled",
          version: sql`${workOrders.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workOrders.id, current.id),
            eq(workOrders.organizationId, context.membership.organizationId),
            eq(workOrders.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) return { status: "stale_update" };
      if (parsed.data.toStatus === "cancelled") {
        await cancelWorkOrderAssignments(
          transaction,
          context,
          current.id,
          parsed.data.reason ?? "Work order cancelled",
          auditRequestContext,
        );
      }
      const action = parsed.data.toStatus === "cancelled"
        ? "work_order.cancelled" as const
        : "work_order.status_changed" as const;
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action,
        outcome: "succeeded",
        target: { type: "work_order", id: value.id },
        requestContext: auditRequestContext,
        reason: parsed.data.reason,
        previousState: workOrderAuditState(current),
        resultingState: workOrderAuditState(value),
      });
      return okResult(value, "work_order.transitioned", auditEvent);
    });
  } catch {
    return persistenceFailure();
  }
}

export async function assignPrimaryTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<DispatchWorkflowMutationResult<DispatchAssignmentRecord>> {
  return assignTechnician(db, context, input, "primary", auditRequestContext);
}

export async function addSupportTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<DispatchWorkflowMutationResult<DispatchAssignmentRecord>> {
  return assignTechnician(db, context, input, "support", auditRequestContext);
}

async function assignTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  role: "primary" | "support",
  auditRequestContext: AuditRequestContext,
): Promise<DispatchWorkflowMutationResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.assign")) return forbidden();
  const parsed = assignTechnicianInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  const conflictOverrideDenied: {
    value: { assignmentId: string; officeId: string } | null;
  } = { value: null };
  try {
    const result = await db.transaction<
      DispatchWorkflowMutationResult<DispatchAssignmentRecord>
    >(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const current = await findAssignmentForMutation(
        transaction,
        context,
        parsed.data.assignmentId,
      );
      if (!current) return notFoundOrInaccessible();
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "dispatch_assignment.assign",
        current.officeId,
      );
      if (actorFailure) return actorFailure;
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (["completed", "cancelled", "draft"].includes(current.status)) {
        return { status: "invalid_transition" };
      }

      const [technician] = await transaction
        .select({ id: technicians.id, status: technicians.status })
        .from(technicians)
        .innerJoin(
          technicianOfficeEligibilities,
          and(
            eq(technicians.id, technicianOfficeEligibilities.technicianId),
            eq(technicians.organizationId, technicianOfficeEligibilities.organizationId),
          ),
        )
        .where(
          and(
            eq(technicians.id, parsed.data.technicianId),
            eq(technicians.organizationId, context.membership.organizationId),
            eq(technicianOfficeEligibilities.officeId, current.officeId),
          ),
        )
        .limit(1);
      if (!technician) return notFoundOrInaccessible();
      if (technician.status !== "active") {
        return { status: "inactive_reference", reason: "technician_inactive" };
      }

      const [duplicate] = await transaction
        .select({ id: assignmentTechnicians.id })
        .from(assignmentTechnicians)
        .where(
          and(
            eq(assignmentTechnicians.dispatchAssignmentId, current.id),
            eq(assignmentTechnicians.technicianId, technician.id),
            eq(assignmentTechnicians.status, "active"),
          ),
        )
        .limit(1);
      if (duplicate) return { status: "invalid_transition" };

      const conflicts = await findScheduleConflicts(
        transaction,
        context,
        technician.id,
        current.id,
        current.assignmentStartAt,
        current.assignmentEndAt,
      );
      const overrideFailure = validateConflictOverride(context, parsed.data, conflicts);
      if (overrideFailure) {
        if (overrideFailure.status === "forbidden" && parsed.data.overrideConflicts) {
          conflictOverrideDenied.value = { assignmentId: current.id, officeId: current.officeId };
        }
        return overrideFailure;
      }

      const previousTechnicianId = role === "primary" ? current.technicianId : null;
      const previousSupportIds = await activeSupportTechnicianIds(transaction, current.id);
      if (role === "primary" && previousTechnicianId) {
        await transaction
          .update(assignmentTechnicians)
          .set({
            status: "ended",
            endedByUserId: context.user.id,
            endedAt: new Date(),
            endReason: "Primary technician reassigned",
          })
          .where(
            and(
              eq(assignmentTechnicians.dispatchAssignmentId, current.id),
              eq(assignmentTechnicians.role, "primary"),
              eq(assignmentTechnicians.status, "active"),
            ),
          );
      }

      await transaction.insert(assignmentTechnicians).values({
        organizationId: context.membership.organizationId,
        officeId: current.officeId,
        dispatchAssignmentId: current.id,
        technicianId: technician.id,
        role,
        assignedByUserId: context.user.id,
      });

      const toStatus = role === "primary" ? "assigned" : current.status;
      const [value] = await transaction
        .update(dispatchAssignments)
        .set({
          technicianId: role === "primary" ? technician.id : current.technicianId,
          status: toStatus,
          version: sql`${dispatchAssignments.version} + 1`,
          updatedByUserId: context.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dispatchAssignments.id, current.id),
            eq(dispatchAssignments.organizationId, context.membership.organizationId),
            eq(dispatchAssignments.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) throw new Error("assignment version changed while locked");

      await transaction.insert(assignmentEvents).values({
        organizationId: context.membership.organizationId,
        officeId: current.officeId,
        dispatchAssignmentId: current.id,
        eventType:
          role === "support"
            ? "support_added"
            : previousTechnicianId
              ? "primary_reassigned"
              : "primary_assigned",
        fromStatus: current.status,
        toStatus,
        technicianId: technician.id,
        previousTechnicianId,
        actedByUserId: context.user.id,
        assignmentVersion: value.version,
      });
      if (conflicts.length > 0) {
        await transaction.insert(assignmentEvents).values({
          organizationId: context.membership.organizationId,
          officeId: current.officeId,
          dispatchAssignmentId: current.id,
          eventType: "conflict_overridden",
          fromStatus: toStatus,
          toStatus,
          technicianId: technician.id,
          reason: parsed.data.overrideReason,
          actedByUserId: context.user.id,
          assignmentVersion: value.version,
        });
      }

      const resultingSupportIds = await activeSupportTechnicianIds(transaction, current.id);
      const action = role === "support"
        ? "dispatch_assignment.support_added" as const
        : previousTechnicianId
          ? "dispatch_assignment.primary_reassigned" as const
          : "dispatch_assignment.primary_assigned" as const;
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action,
        outcome: "succeeded",
        target: { type: "dispatch_assignment", id: value.id },
        secondaryTarget: { type: "technician", id: technician.id },
        requestContext: auditRequestContext,
        previousState: assignmentAuditState(current, previousSupportIds),
        resultingState: assignmentAuditState(value, resultingSupportIds, conflicts.length > 0),
        metadata: previousTechnicianId
          ? { previousTechnicianId, newTechnicianId: technician.id }
          : { technicianId: technician.id },
      });
      if (conflicts.length > 0) {
        const visibleConflict = conflicts.find((conflict) => !conflict.redacted);
        await appendAuditEvent(transaction, context, {
          officeId: value.officeId,
          action: "dispatch_assignment.conflict_overridden",
          outcome: "succeeded",
          target: { type: "dispatch_assignment", id: value.id },
          secondaryTarget: visibleConflict && !visibleConflict.redacted
            ? { type: "dispatch_assignment", id: visibleConflict.assignmentId }
            : undefined,
          requestContext: auditRequestContext,
          reason: parsed.data.overrideReason,
          previousState: assignmentAuditState(current, previousSupportIds),
          resultingState: assignmentAuditState(value, resultingSupportIds, true),
          metadata: { conflictCount: conflicts.length, resultingVersion: value.version },
        });
      }

      return okResult(
        value,
        role === "primary"
          ? "dispatch_assignment.primary_assigned"
          : "dispatch_assignment.support_added",
        auditEvent,
      );
    });
    if (conflictOverrideDenied.value) {
      await appendDeniedAuditEvent(db, context, {
        officeId: conflictOverrideDenied.value.officeId,
        action: "authorization.conflict_override_denied",
        outcome: "denied",
        target: { type: "dispatch_assignment", id: conflictOverrideDenied.value.assignmentId },
        requestContext: auditRequestContext,
        metadata: { requestedOperation: role === "primary" ? "assign_primary" : "add_support" },
      });
    }
    return result;
  } catch {
    return persistenceFailure();
  }
}

export async function removeAssignmentTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordMutationResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.assign")) return forbidden();
  const parsed = removeAssignmentTechnicianInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const current = await findAssignmentForMutation(
        transaction,
        context,
        parsed.data.assignmentId,
      );
      if (!current) return notFoundOrInaccessible();
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "dispatch_assignment.assign",
        current.officeId,
      );
      if (actorFailure) return actorFailure;
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (["completed", "cancelled", "in_progress"].includes(current.status)) {
        return { status: "invalid_transition" };
      }

      const [relationship] = await transaction
        .select()
        .from(assignmentTechnicians)
        .where(
          and(
            eq(assignmentTechnicians.dispatchAssignmentId, current.id),
            eq(assignmentTechnicians.technicianId, parsed.data.technicianId),
            eq(assignmentTechnicians.status, "active"),
          ),
        )
        .limit(1);
      if (!relationship) return notFoundOrInaccessible();

      const previousSupportIds = await activeSupportTechnicianIds(transaction, current.id);

      await transaction
        .update(assignmentTechnicians)
        .set({
          status: "ended",
          endedByUserId: context.user.id,
          endedAt: new Date(),
          endReason: parsed.data.reason,
        })
        .where(eq(assignmentTechnicians.id, relationship.id));

      const toStatus = relationship.role === "primary" ? "unassigned" : current.status;
      const [value] = await transaction
        .update(dispatchAssignments)
        .set({
          technicianId: relationship.role === "primary" ? null : current.technicianId,
          status: toStatus,
          version: sql`${dispatchAssignments.version} + 1`,
          updatedByUserId: context.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dispatchAssignments.id, current.id),
            eq(dispatchAssignments.organizationId, context.membership.organizationId),
            eq(dispatchAssignments.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) throw new Error("assignment version changed while locked");

      await transaction.insert(assignmentEvents).values({
        organizationId: context.membership.organizationId,
        officeId: current.officeId,
        dispatchAssignmentId: current.id,
        eventType: relationship.role === "primary" ? "primary_removed" : "support_removed",
        fromStatus: current.status,
        toStatus,
        previousTechnicianId: relationship.technicianId,
        reason: parsed.data.reason,
        actedByUserId: context.user.id,
        assignmentVersion: value.version,
      });
      await reconcileWorkOrder(
        transaction,
        context,
        current.workOrderId,
        auditRequestContext,
      );
      const resultingSupportIds = await activeSupportTechnicianIds(transaction, current.id);
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: relationship.role === "primary"
          ? "dispatch_assignment.primary_removed"
          : "dispatch_assignment.support_removed",
        outcome: "succeeded",
        target: { type: "dispatch_assignment", id: value.id },
        secondaryTarget: { type: "technician", id: relationship.technicianId },
        requestContext: auditRequestContext,
        reason: parsed.data.reason,
        previousState: assignmentAuditState(current, previousSupportIds),
        resultingState: assignmentAuditState(value, resultingSupportIds),
      });
      return okResult(value, "dispatch_assignment.technician_removed", auditEvent);
    });
  } catch {
    return persistenceFailure();
  }
}

export async function transitionAssignment(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordMutationResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.transition")) return forbidden();
  return transitionAssignmentWithPermission(db, context, input, false, auditRequestContext);
}

export async function acknowledgeOwnAssignment(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordMutationResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.acknowledge_own")) {
    await appendDeniedAuditEvent(db, context, {
      action: "authorization.own_assignment_access_denied",
      outcome: "denied",
      target: { type: "organization", id: context.membership.organizationId },
      requestContext: auditRequestContext,
      metadata: { requestedOperation: "acknowledge_assignment" },
    });
    return forbidden();
  }
  return transitionAssignmentWithPermission(db, context, input, true, auditRequestContext);
}

async function transitionAssignmentWithPermission(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  ownAcknowledgment: boolean,
  auditRequestContext: AuditRequestContext,
): Promise<OperationalRecordMutationResult<DispatchAssignmentRecord>> {
  const parsed = assignmentTransitionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }
  if (ownAcknowledgment && parsed.data.toStatus !== "acknowledged") {
    return { status: "invalid_transition" };
  }

  const ownAccessDenied: {
    value: { assignmentId: string; officeId: string } | null;
  } = { value: null };
  try {
    const result = await db.transaction<
      OperationalRecordMutationResult<DispatchAssignmentRecord>
    >(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const current = await findAssignmentForMutation(
        transaction,
        context,
        parsed.data.assignmentId,
      );
      if (!current) return notFoundOrInaccessible();
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        ownAcknowledgment
          ? "dispatch_assignment.acknowledge_own"
          : "dispatch_assignment.transition",
        current.officeId,
      );
      if (actorFailure) return actorFailure;
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (!canTransitionAssignment(current.status, parsed.data.toStatus)) {
        return { status: "invalid_transition" };
      }
      if (parsed.data.toStatus === "cancelled" && !parsed.data.reason) {
        return {
          status: "validation_error",
          issues: ["reason: cancellation reason is required"],
        };
      }

      if (ownAcknowledgment) {
        const [ownedPrimary] = await transaction
          .select({ id: assignmentTechnicians.id })
          .from(assignmentTechnicians)
          .innerJoin(
            technicians,
            and(
              eq(assignmentTechnicians.technicianId, technicians.id),
              eq(assignmentTechnicians.organizationId, technicians.organizationId),
            ),
          )
          .where(
            and(
              eq(assignmentTechnicians.dispatchAssignmentId, current.id),
              eq(assignmentTechnicians.role, "primary"),
              eq(assignmentTechnicians.status, "active"),
              eq(technicians.organizationMembershipId, context.membership.id),
            ),
          )
          .limit(1);
        if (!ownedPrimary) {
          ownAccessDenied.value = { assignmentId: current.id, officeId: current.officeId };
          return notFoundOrInaccessible();
        }
      }

      const previousSupportIds = await activeSupportTechnicianIds(transaction, current.id);

      const [value] = await transaction
        .update(dispatchAssignments)
        .set({
          status: parsed.data.toStatus,
          cancellationReason:
            parsed.data.toStatus === "cancelled" ? parsed.data.reason : null,
          isActive: !["completed", "cancelled"].includes(parsed.data.toStatus),
          version: sql`${dispatchAssignments.version} + 1`,
          updatedByUserId: context.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dispatchAssignments.id, current.id),
            eq(dispatchAssignments.organizationId, context.membership.organizationId),
            eq(dispatchAssignments.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) throw new Error("assignment version changed while locked");

      await transaction.insert(assignmentEvents).values({
        organizationId: context.membership.organizationId,
        officeId: current.officeId,
        dispatchAssignmentId: current.id,
        eventType: assignmentEventForTransition(parsed.data.toStatus),
        fromStatus: current.status,
        toStatus: parsed.data.toStatus,
        technicianId: current.technicianId,
        reason: parsed.data.reason,
        actedByUserId: context.user.id,
        assignmentVersion: value.version,
      });

      if (["completed", "cancelled"].includes(parsed.data.toStatus)) {
        await endActiveRelationships(
          transaction,
          current.id,
          context.user.id,
          parsed.data.reason ?? `Assignment ${parsed.data.toStatus}`,
        );
      }
      await reconcileWorkOrder(
        transaction,
        context,
        current.workOrderId,
        auditRequestContext,
      );
      const resultingSupportIds = await activeSupportTechnicianIds(transaction, current.id);
      const action = auditActionForAssignmentTransition(parsed.data.toStatus);
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action,
        outcome: "succeeded",
        target: { type: "dispatch_assignment", id: value.id },
        secondaryTarget: value.technicianId
          ? { type: "technician", id: value.technicianId }
          : undefined,
        requestContext: auditRequestContext,
        reason: parsed.data.reason,
        previousState: assignmentAuditState(current, previousSupportIds),
        resultingState: assignmentAuditState(value, resultingSupportIds),
      });
      return okResult(
        value,
        ownAcknowledgment
          ? "dispatch_assignment.acknowledged"
          : "dispatch_assignment.transitioned",
        auditEvent,
      );
    });
    if (ownAccessDenied.value) {
      await appendDeniedAuditEvent(db, context, {
        officeId: ownAccessDenied.value.officeId,
        action: "authorization.own_assignment_access_denied",
        outcome: "denied",
        target: { type: "dispatch_assignment", id: ownAccessDenied.value.assignmentId },
        requestContext: auditRequestContext,
        metadata: { requestedOperation: "acknowledge_assignment" },
      });
    }
    if (
      !ownAcknowledgment &&
      result.status === "not_found_or_inaccessible"
    ) {
      await recordCrossOfficeAssignmentDenialIfApplicable(
        db,
        context,
        parsed.data.assignmentId,
        auditRequestContext,
        "transition_assignment",
      );
    }
    return result;
  } catch {
    return persistenceFailure();
  }
}

export async function updateAssignmentSchedule(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<DispatchWorkflowMutationResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.manage")) return forbidden();
  const parsed = updateAssignmentScheduleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  const conflictOverrideDenied: {
    value: { assignmentId: string; officeId: string } | null;
  } = { value: null };
  try {
    const result = await db.transaction<
      DispatchWorkflowMutationResult<DispatchAssignmentRecord>
    >(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const current = await findAssignmentForMutation(
        transaction,
        context,
        parsed.data.assignmentId,
      );
      if (!current) return notFoundOrInaccessible();
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "dispatch_assignment.manage",
        current.officeId,
      );
      if (actorFailure) return actorFailure;
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (["completed", "cancelled"].includes(current.status)) {
        return { status: "invalid_transition" };
      }

      const activeTechnicians = await transaction
        .select({ technicianId: assignmentTechnicians.technicianId })
        .from(assignmentTechnicians)
        .where(
          and(
            eq(assignmentTechnicians.dispatchAssignmentId, current.id),
            eq(assignmentTechnicians.status, "active"),
          ),
        );
      const conflicts = (
        await Promise.all(
          activeTechnicians.map((relationship) =>
            findScheduleConflicts(
              transaction,
              context,
              relationship.technicianId,
              current.id,
              parsed.data.assignmentStartAt,
              parsed.data.assignmentEndAt,
            ),
          ),
        )
      ).flat();
      const overrideFailure = validateConflictOverride(context, parsed.data, conflicts);
      if (overrideFailure) {
        if (overrideFailure.status === "forbidden" && parsed.data.overrideConflicts) {
          conflictOverrideDenied.value = { assignmentId: current.id, officeId: current.officeId };
        }
        return overrideFailure;
      }

      const [value] = await transaction
        .update(dispatchAssignments)
        .set({
          assignmentStartAt: parsed.data.assignmentStartAt,
          assignmentEndAt: parsed.data.assignmentEndAt,
          version: sql`${dispatchAssignments.version} + 1`,
          updatedByUserId: context.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dispatchAssignments.id, current.id),
            eq(dispatchAssignments.organizationId, context.membership.organizationId),
            eq(dispatchAssignments.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) throw new Error("assignment version changed while locked");

      await transaction.insert(assignmentEvents).values({
        organizationId: context.membership.organizationId,
        officeId: current.officeId,
        dispatchAssignmentId: current.id,
        eventType: "schedule_changed",
        fromStatus: current.status,
        toStatus: current.status,
        reason: parsed.data.overrideReason,
        actedByUserId: context.user.id,
        assignmentVersion: value.version,
      });
      if (conflicts.length > 0) {
        await transaction.insert(assignmentEvents).values({
          organizationId: context.membership.organizationId,
          officeId: current.officeId,
          dispatchAssignmentId: current.id,
          eventType: "conflict_overridden",
          fromStatus: current.status,
          toStatus: current.status,
          reason: parsed.data.overrideReason,
          actedByUserId: context.user.id,
          assignmentVersion: value.version,
        });
      }
      const supportIds = activeTechnicians
        .map((relationship) => relationship.technicianId)
        .filter((technicianId) => technicianId !== current.technicianId);
      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: "dispatch_assignment.schedule_changed",
        outcome: "succeeded",
        target: { type: "dispatch_assignment", id: value.id },
        requestContext: auditRequestContext,
        previousState: assignmentAuditState(current, supportIds),
        resultingState: assignmentAuditState(value, supportIds, conflicts.length > 0),
      });
      if (conflicts.length > 0) {
        const visibleConflict = conflicts.find((conflict) => !conflict.redacted);
        await appendAuditEvent(transaction, context, {
          officeId: value.officeId,
          action: "dispatch_assignment.conflict_overridden",
          outcome: "succeeded",
          target: { type: "dispatch_assignment", id: value.id },
          secondaryTarget: visibleConflict && !visibleConflict.redacted
            ? { type: "dispatch_assignment", id: visibleConflict.assignmentId }
            : undefined,
          requestContext: auditRequestContext,
          reason: parsed.data.overrideReason,
          previousState: assignmentAuditState(current, supportIds),
          resultingState: assignmentAuditState(value, supportIds, true),
          metadata: { conflictCount: conflicts.length, resultingVersion: value.version },
        });
      }
      return okResult(value, "dispatch_assignment.schedule_updated", auditEvent);
    });
    if (conflictOverrideDenied.value) {
      await appendDeniedAuditEvent(db, context, {
        officeId: conflictOverrideDenied.value.officeId,
        action: "authorization.conflict_override_denied",
        outcome: "denied",
        target: { type: "dispatch_assignment", id: conflictOverrideDenied.value.assignmentId },
        requestContext: auditRequestContext,
        metadata: { requestedOperation: "change_schedule" },
      });
    }
    return result;
  } catch {
    return persistenceFailure();
  }
}

async function findAssignmentForMutation(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  assignmentId: string,
): Promise<DispatchAssignmentRecord | undefined> {
  const [value] = await transaction
    .select()
    .from(dispatchAssignments)
    .where(
      and(
        operationalRecordScopePredicate(
          context.tenantScope,
          dispatchAssignments.organizationId,
          dispatchAssignments.officeId,
        ),
        eq(dispatchAssignments.id, assignmentId),
      ),
    )
    .limit(1);
  return value;
}

async function findScheduleConflicts(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  technicianId: string,
  ignoredAssignmentId: string,
  startAt: Date,
  endAt: Date,
): Promise<ScheduleConflict[]> {
  const rows = await transaction
    .select({
      assignmentId: dispatchAssignments.id,
      officeId: dispatchAssignments.officeId,
      workOrderNumber: workOrders.workOrderNumber,
      assignmentStartAt: dispatchAssignments.assignmentStartAt,
      assignmentEndAt: dispatchAssignments.assignmentEndAt,
      status: dispatchAssignments.status,
    })
    .from(assignmentTechnicians)
    .innerJoin(
      dispatchAssignments,
      and(
        eq(assignmentTechnicians.dispatchAssignmentId, dispatchAssignments.id),
        eq(assignmentTechnicians.organizationId, dispatchAssignments.organizationId),
        eq(assignmentTechnicians.officeId, dispatchAssignments.officeId),
      ),
    )
    .innerJoin(workOrders, eq(dispatchAssignments.workOrderId, workOrders.id))
    .where(
      and(
        eq(assignmentTechnicians.organizationId, context.membership.organizationId),
        eq(assignmentTechnicians.technicianId, technicianId),
        eq(assignmentTechnicians.status, "active"),
        ne(dispatchAssignments.id, ignoredAssignmentId),
        ne(dispatchAssignments.status, "cancelled"),
        sql`${dispatchAssignments.assignmentStartAt} < ${endAt}`,
        sql`${dispatchAssignments.assignmentEndAt} > ${startAt}`,
      ),
    );

  return rows.map((row) =>
    canAccessOffice(context, row.officeId)
      ? { redacted: false as const, ...row }
      : { redacted: true as const },
  );
}

async function recordCrossOfficeAssignmentDenialIfApplicable(
  db: OperationalDatabase,
  context: AuthorizationContext,
  assignmentId: string,
  auditRequestContext: AuditRequestContext,
  requestedOperation: string,
): Promise<void> {
  const [sameOrganizationAssignment] = await db
    .select({ id: dispatchAssignments.id, officeId: dispatchAssignments.officeId })
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.id, assignmentId),
        eq(dispatchAssignments.organizationId, context.membership.organizationId),
      ),
    )
    .limit(1);
  if (
    !sameOrganizationAssignment ||
    canAccessOffice(context, sameOrganizationAssignment.officeId)
  ) {
    return;
  }

  await appendDeniedAuditEvent(db, context, {
    officeId: sameOrganizationAssignment.officeId,
    action: "authorization.cross_office_mutation_denied",
    outcome: "denied",
    target: { type: "dispatch_assignment", id: sameOrganizationAssignment.id },
    requestContext: auditRequestContext,
    metadata: { requestedOperation },
  });
}

function validateConflictOverride(
  context: AuthorizationContext,
  input: { overrideConflicts: boolean; overrideReason?: string },
  conflicts: ScheduleConflict[],
): { status: "schedule_conflict"; conflicts: ScheduleConflict[] } | OperationalRecordFailure | null {
  if (conflicts.length === 0) return null;
  if (!input.overrideConflicts) return { status: "schedule_conflict", conflicts };
  if (!hasPermission(context, "dispatch_assignment.conflict_override")) return forbidden();
  if (!hasConflictOverrideReason(input.overrideReason)) {
    return {
      status: "validation_error",
      issues: ["overrideReason: an override reason of at least 8 characters is required"],
    };
  }
  return null;
}

async function reconcileWorkOrder(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  workOrderId: string,
  auditRequestContext: AuditRequestContext,
): Promise<void> {
  const [workOrder] = await transaction
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, context.membership.organizationId),
      ),
    )
    .limit(1);
  if (!workOrder) throw new Error("assignment work order disappeared");
  const statuses = await transaction
    .select({ status: dispatchAssignments.status })
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.workOrderId, workOrderId),
        eq(dispatchAssignments.organizationId, context.membership.organizationId),
      ),
    );
  const nextStatus = reconcileWorkOrderStatus(
    workOrder.status,
    statuses.map((row) => row.status),
  );
  if (nextStatus === workOrder.status) return;
  const [resultingWorkOrder] = await transaction
    .update(workOrders)
    .set({
      status: nextStatus,
      isActive: !["completed", "cancelled"].includes(nextStatus),
      version: sql`${workOrders.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workOrders.id, workOrder.id),
        eq(workOrders.organizationId, context.membership.organizationId),
      ),
    )
    .returning();
  if (!resultingWorkOrder) throw new Error("work_order_reconciliation_failed");
  await appendAuditEvent(transaction, context, {
    officeId: resultingWorkOrder.officeId,
    action: "work_order.status_changed",
    outcome: "succeeded",
    target: { type: "work_order", id: resultingWorkOrder.id },
    requestContext: auditRequestContext,
    previousState: workOrderAuditState(workOrder),
    resultingState: workOrderAuditState(resultingWorkOrder),
    metadata: { source: "assignment_reconciliation" },
  });
}

async function cancelWorkOrderAssignments(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  workOrderId: string,
  reason: string,
  auditRequestContext: AuditRequestContext,
): Promise<void> {
  const activeAssignments = await transaction
    .select()
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.organizationId, context.membership.organizationId),
        eq(dispatchAssignments.workOrderId, workOrderId),
        notInArray(dispatchAssignments.status, ["completed", "cancelled"]),
      ),
    );
  for (const assignment of activeAssignments) {
    const supportIds = await activeSupportTechnicianIds(transaction, assignment.id);
    const [updated] = await transaction
      .update(dispatchAssignments)
      .set({
        status: "cancelled",
        cancellationReason: reason,
        isActive: false,
        version: sql`${dispatchAssignments.version} + 1`,
        updatedByUserId: context.user.id,
        updatedAt: new Date(),
      })
      .where(eq(dispatchAssignments.id, assignment.id))
      .returning();
    if (!updated) throw new Error("assignment_cancellation_failed");
    await transaction.insert(assignmentEvents).values({
      organizationId: context.membership.organizationId,
      officeId: assignment.officeId,
      dispatchAssignmentId: assignment.id,
      eventType: "cancelled",
      fromStatus: assignment.status,
      toStatus: "cancelled",
      technicianId: assignment.technicianId,
      reason,
      actedByUserId: context.user.id,
      assignmentVersion: updated.version,
    });
    await endActiveRelationships(
      transaction,
      assignment.id,
      context.user.id,
      reason,
    );
    await appendAuditEvent(transaction, context, {
      officeId: updated.officeId,
      action: "dispatch_assignment.cancelled",
      outcome: "succeeded",
      target: { type: "dispatch_assignment", id: updated.id },
      secondaryTarget: { type: "work_order", id: workOrderId },
      requestContext: auditRequestContext,
      reason,
      previousState: assignmentAuditState(assignment, supportIds),
      resultingState: assignmentAuditState(updated, []),
      metadata: { source: "work_order_cancellation" },
    });
  }
}

async function endActiveRelationships(
  transaction: OperationalTransaction,
  assignmentId: string,
  userId: string,
  reason: string,
): Promise<void> {
  await transaction
    .update(assignmentTechnicians)
    .set({
      status: "ended",
      endedByUserId: userId,
      endedAt: new Date(),
      endReason: reason,
    })
    .where(
      and(
        eq(assignmentTechnicians.dispatchAssignmentId, assignmentId),
        eq(assignmentTechnicians.status, "active"),
      ),
    );
}

async function activeSupportTechnicianIds(
  transaction: OperationalTransaction,
  assignmentId: string,
): Promise<string[]> {
  const rows = await transaction
    .select({ technicianId: assignmentTechnicians.technicianId })
    .from(assignmentTechnicians)
    .where(
      and(
        eq(assignmentTechnicians.dispatchAssignmentId, assignmentId),
        eq(assignmentTechnicians.role, "support"),
        eq(assignmentTechnicians.status, "active"),
      ),
    );
  return rows.map((row) => row.technicianId);
}

async function addTechnicianRelationships(
  db: OperationalDatabase,
  rows: Omit<DispatchBoardItem, "primaryTechnician" | "supportTechnicians">[],
): Promise<DispatchBoardItem[]> {
  const assignmentIds = rows.map((row) => row.assignment.id);
  if (assignmentIds.length === 0) return [];
  const relationships = await db
    .select({
      assignmentId: assignmentTechnicians.dispatchAssignmentId,
      role: assignmentTechnicians.role,
      technicianId: technicians.id,
      displayName: technicians.displayName,
    })
    .from(assignmentTechnicians)
    .innerJoin(
      technicians,
      and(
        eq(assignmentTechnicians.technicianId, technicians.id),
        eq(assignmentTechnicians.organizationId, technicians.organizationId),
      ),
    )
    .where(
      and(
        inArray(assignmentTechnicians.dispatchAssignmentId, assignmentIds),
        eq(assignmentTechnicians.status, "active"),
      ),
    );
  return rows.map((row) => {
    const assigned = relationships.filter(
      (relationship) => relationship.assignmentId === row.assignment.id,
    );
    const primary = assigned.find((relationship) => relationship.role === "primary");
    return {
      ...row,
      primaryTechnician: primary
        ? { id: primary.technicianId, displayName: primary.displayName }
        : null,
      supportTechnicians: assigned
        .filter((relationship) => relationship.role === "support")
        .map((relationship) => ({
          id: relationship.technicianId,
          displayName: relationship.displayName,
        })),
    };
  });
}

function okResult<T extends { id: string }>(
  value: T,
  action: Parameters<typeof createMutationMetadata>[0],
  auditEvent: AuditEventRecord,
): OperationalRecordMutationResult<T> {
  return {
    status: "ok",
    value,
    mutation: createMutationMetadata(action, value.id, auditEvent),
  };
}

function auditActionForAssignmentTransition(
  toStatus: DispatchAssignmentStatus,
) {
  const actionByStatus = {
    draft: "dispatch_assignment.created",
    unassigned: "dispatch_assignment.primary_removed",
    assigned: "dispatch_assignment.primary_assigned",
    acknowledged: "dispatch_assignment.acknowledged",
    in_progress: "dispatch_assignment.started",
    completed: "dispatch_assignment.completed",
    cancelled: "dispatch_assignment.cancelled",
  } as const;
  return actionByStatus[toStatus];
}
