import { and, eq, sql } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  assignmentEvents,
  dispatchAssignments,
  offices,
  organizationMemberships,
  projects,
  serviceTypes,
  technicianOfficeEligibilities,
  technicians,
  workOrders,
  type DispatchAssignmentRecord,
  type ProjectRecord,
  type TechnicianRecord,
  type WorkOrderRecord,
} from "@/server/db/schema";
import { hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import { createAuditRequestContext, type AuditRequestContext } from "@/server/audit/request-context";
import {
  assignmentAuditState,
  projectAuditState,
  technicianAuditState,
  workOrderAuditState,
} from "@/server/audit/serializers";
import { appendAuditEvent } from "@/server/audit/writer";
import { getPostgresErrorInfo } from "@/server/tenancy/errors";
import { uuidInputSchema, validationIssues } from "@/server/tenancy/validation";
import {
  createDispatchAssignmentInputSchema,
  createProjectInputSchema,
  createTechnicianInputSchema,
  createWorkOrderInputSchema,
} from "./validation";
import {
  forbidden,
  createMutationMetadata,
  notFoundOrInaccessible,
  persistenceFailure,
  type OperationalRecordConflictReason,
  type OperationalRecordCreateResult,
  type OperationalRecordFailure,
  type OperationalRecordListResult,
  type OperationalRecordLookupResult,
  type OperationalRecordMutationAction,
} from "./results";
import { operationalRecordScopePredicate } from "./scope";
import {
  lockOperationalOrganization,
  revalidateOperationalActor,
} from "./mutation-context";

export async function listProjects(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<ProjectRecord>> {
  if (!hasPermission(context, "project.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(projects)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          projects.organizationId,
          projects.officeId,
        ),
      )
      .orderBy(projects.projectNumber, projects.name);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findProjectById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<ProjectRecord>> {
  if (!hasPermission(context, "project.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(projects)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            projects.organizationId,
            projects.officeId,
          ),
          eq(projects.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listTechnicians(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(technicians)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          technicians.organizationId,
          technicians.officeId,
        ),
      )
      .orderBy(technicians.displayName, technicians.sourceTechnicianId);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findTechnicianById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(technicians)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            technicians.organizationId,
            technicians.officeId,
          ),
          eq(technicians.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listWorkOrders(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(workOrders)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          workOrders.organizationId,
          workOrders.officeId,
        ),
      )
      .orderBy(workOrders.scheduledStartAt, workOrders.workOrderNumber);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findWorkOrderById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(workOrders)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            workOrders.organizationId,
            workOrders.officeId,
          ),
          eq(workOrders.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listDispatchAssignments(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(dispatchAssignments)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          dispatchAssignments.organizationId,
          dispatchAssignments.officeId,
        ),
      )
      .orderBy(
        dispatchAssignments.assignmentStartAt,
        dispatchAssignments.sourceAssignmentId,
      );

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findDispatchAssignmentById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(dispatchAssignments)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            dispatchAssignments.organizationId,
            dispatchAssignments.officeId,
          ),
          eq(dispatchAssignments.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function createProject(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordCreateResult<ProjectRecord>> {
  if (!hasPermission(context, "project.manage")) {
    return forbidden();
  }

  const parsed = createProjectInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);

      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "project.manage",
        parsed.data.officeId,
      );
      if (actorFailure) {
        return actorFailure;
      }

      const [value] = await transaction
        .insert(projects)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          isActive: parsed.data.status === "active",
        })
        .returning();

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: "project.created",
        outcome: "succeeded",
        target: { type: "project", id: value.id },
        requestContext: auditRequestContext,
        resultingState: projectAuditState(value),
      });
      return created(value, "project.created", auditEvent);
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "projects_organization_source_unique",
      "project_source_already_exists",
      ["projects_office_organization_fk"],
    );
  }
}

export async function createTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordCreateResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.manage")) {
    return forbidden();
  }

  const parsed = createTechnicianInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);

      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "technician.manage",
        parsed.data.officeId,
      );
      if (actorFailure) {
        return actorFailure;
      }

      if (parsed.data.organizationMembershipId) {
        const [membership] = await transaction
          .select({ id: organizationMemberships.id })
          .from(organizationMemberships)
          .where(
            and(
              eq(organizationMemberships.id, parsed.data.organizationMembershipId),
              eq(
                organizationMemberships.organizationId,
                context.membership.organizationId,
              ),
              eq(organizationMemberships.role, "field_technician"),
              eq(organizationMemberships.status, "active"),
            ),
          )
          .limit(1);
        if (!membership) return notFoundOrInaccessible();
      }

      const [value] = await transaction
        .insert(technicians)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          homeOfficeId: parsed.data.officeId,
          isActive: parsed.data.status === "active",
        })
        .returning();

      await transaction.insert(technicianOfficeEligibilities).values({
        organizationId: context.membership.organizationId,
        officeId: parsed.data.officeId,
        technicianId: value.id,
        createdByUserId: context.user.id,
      });

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: "technician.created",
        outcome: "succeeded",
        target: { type: "technician", id: value.id },
        requestContext: auditRequestContext,
        resultingState: technicianAuditState(value, [value.homeOfficeId]),
      });
      return created(value, "technician.created", auditEvent);
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "technicians_organization_source_unique",
      "technician_source_already_exists",
      ["technicians_office_organization_fk"],
    );
  }
}

export async function createWorkOrder(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordCreateResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.manage")) {
    return forbidden();
  }

  const parsed = createWorkOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);

      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "work_order.manage",
        parsed.data.officeId,
      );
      if (actorFailure) {
        return actorFailure;
      }

      const [project] = await transaction
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsed.data.projectId),
            eq(projects.organizationId, context.membership.organizationId),
            eq(projects.officeId, parsed.data.officeId),
            eq(projects.status, "active"),
          ),
        )
        .limit(1);

      const [serviceType] = await transaction
        .select({
          id: serviceTypes.id,
          name: serviceTypes.name,
          officeId: serviceTypes.officeId,
          status: serviceTypes.status,
        })
        .from(serviceTypes)
        .where(
          and(
            eq(serviceTypes.id, parsed.data.serviceTypeId),
            eq(serviceTypes.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);

      const [office] = await transaction
        .select({ timeZone: offices.timeZone })
        .from(offices)
        .where(
          and(
            eq(offices.id, parsed.data.officeId),
            eq(offices.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);

      if (!project || !serviceType || !office) {
        return notFoundOrInaccessible();
      }
      if (
        serviceType.officeId !== null &&
        serviceType.officeId !== parsed.data.officeId
      ) {
        return notFoundOrInaccessible();
      }
      if (serviceType.status !== "active") {
        return { status: "inactive_reference", reason: "service_type_inactive" };
      }

      const [value] = await transaction
        .insert(workOrders)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          serviceType: serviceType.name,
          status: "draft",
          timeZone: office.timeZone,
          isActive: true,
        })
        .returning();

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: "work_order.created",
        outcome: "succeeded",
        target: { type: "work_order", id: value.id },
        secondaryTarget: { type: "project", id: value.projectId },
        requestContext: auditRequestContext,
        resultingState: workOrderAuditState(value),
      });
      return created(value, "work_order.created", auditEvent);
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "work_orders_organization_source_unique",
      "work_order_source_already_exists",
      [
        "work_orders_office_organization_fk",
        "work_orders_project_organization_office_fk",
        "work_orders_service_type_organization_fk",
      ],
    );
  }
}

export async function createDispatchAssignment(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
  auditRequestContext: AuditRequestContext = createAuditRequestContext(),
): Promise<OperationalRecordCreateResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.manage")) {
    return forbidden();
  }

  const parsed = createDispatchAssignmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);

      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "dispatch_assignment.manage",
        parsed.data.officeId,
      );
      if (actorFailure) {
        return actorFailure;
      }

      const [existingSource] = await transaction
        .select({ id: dispatchAssignments.id })
        .from(dispatchAssignments)
        .where(
          and(
            eq(
              dispatchAssignments.organizationId,
              context.membership.organizationId,
            ),
            eq(dispatchAssignments.sourceSystem, parsed.data.sourceSystem),
            eq(
              dispatchAssignments.sourceAssignmentId,
              parsed.data.sourceAssignmentId,
            ),
          ),
        )
        .limit(1);
      if (existingSource) {
        return {
          status: "conflict",
          reason: "dispatch_assignment_source_already_exists",
        };
      }

      const [workOrder] = await transaction
        .select()
        .from(workOrders)
        .where(
          and(
            eq(workOrders.id, parsed.data.workOrderId),
            eq(workOrders.organizationId, context.membership.organizationId),
            eq(workOrders.officeId, parsed.data.officeId),
          ),
        )
        .limit(1);

      if (!workOrder) {
        return notFoundOrInaccessible();
      }
      if (workOrder.status !== "ready_for_dispatch") {
        return { status: "invalid_transition" };
      }

      const [value] = await transaction
        .insert(dispatchAssignments)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          technicianId: null,
          status: "unassigned",
          timeZone: workOrder.timeZone,
          isActive: true,
          createdByUserId: context.user.id,
          updatedByUserId: context.user.id,
        })
        .returning();

      await transaction.insert(assignmentEvents).values({
        organizationId: context.membership.organizationId,
        officeId: parsed.data.officeId,
        dispatchAssignmentId: value.id,
        eventType: "created",
        fromStatus: null,
        toStatus: "unassigned",
        actedByUserId: context.user.id,
        assignmentVersion: value.version,
      });

      const [scheduledWorkOrder] = await transaction
        .update(workOrders)
        .set({
          status: "scheduled",
          updatedAt: new Date(),
          version: sql`${workOrders.version} + 1`,
        })
        .where(
          and(
            eq(workOrders.id, workOrder.id),
            eq(workOrders.organizationId, context.membership.organizationId),
            eq(workOrders.status, "ready_for_dispatch"),
          ),
        )
        .returning();

      if (!scheduledWorkOrder) {
        throw new Error("work_order_schedule_reconciliation_failed");
      }

      await appendAuditEvent(transaction, context, {
        officeId: scheduledWorkOrder.officeId,
        action: "work_order.status_changed",
        outcome: "succeeded",
        target: { type: "work_order", id: scheduledWorkOrder.id },
        secondaryTarget: { type: "dispatch_assignment", id: value.id },
        requestContext: auditRequestContext,
        previousState: workOrderAuditState(workOrder),
        resultingState: workOrderAuditState(scheduledWorkOrder),
        metadata: { source: "assignment_creation" },
      });

      const auditEvent = await appendAuditEvent(transaction, context, {
        officeId: value.officeId,
        action: "dispatch_assignment.created",
        outcome: "succeeded",
        target: { type: "dispatch_assignment", id: value.id },
        secondaryTarget: { type: "work_order", id: value.workOrderId },
        requestContext: auditRequestContext,
        resultingState: assignmentAuditState(value),
      });
      return created(value, "dispatch_assignment.created", auditEvent);
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "dispatch_assignments_organization_source_unique",
      "dispatch_assignment_source_already_exists",
      [
        "dispatch_assignments_work_order_organization_office_fk",
      ],
    );
  }
}

function parseRecordId(
  input: unknown,
):
  | { ok: true; id: string }
  | { ok: false; failure: OperationalRecordFailure } {
  const parsed = uuidInputSchema.safeParse(input);

  return parsed.success
    ? { ok: true, id: parsed.data }
    : {
        ok: false,
        failure: {
          status: "validation_error",
          issues: validationIssues(parsed.error),
        },
      };
}

function created<T extends { id: string }>(
  value: T,
  action: OperationalRecordMutationAction,
  auditEvent: import("@/server/db/schema").AuditEventRecord,
): OperationalRecordCreateResult<T> {
  return {
    status: "created",
    value,
    mutation: createMutationMetadata(action, value.id, auditEvent),
  };
}

function failureForDatabaseError(
  error: unknown,
  uniqueConstraint: string,
  conflictReason: OperationalRecordConflictReason,
  inaccessibleForeignKeys: readonly string[],
): OperationalRecordFailure {
  const info = getPostgresErrorInfo(error);

  if (info.code === "23505" && info.constraint === uniqueConstraint) {
    return { status: "conflict", reason: conflictReason };
  }

  if (
    info.code === "23503" &&
    info.constraint !== undefined &&
    inaccessibleForeignKeys.includes(info.constraint)
  ) {
    return notFoundOrInaccessible();
  }

  return persistenceFailure();
}
