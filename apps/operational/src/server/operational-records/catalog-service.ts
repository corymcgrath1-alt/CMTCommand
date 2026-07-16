import { and, eq, sql } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  assignmentTechnicians,
  dispatchAssignments,
  organizationMemberships,
  offices,
  projects,
  serviceTypes,
  technicianOfficeEligibilities,
  technicians,
  type ProjectRecord,
  type ServiceTypeRecord,
  type TechnicianOfficeEligibilityRecord,
  type TechnicianRecord,
  type WorkOrderRecord,
  workOrders,
} from "@/server/db/schema";
import { hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import { getPostgresErrorInfo } from "@/server/tenancy/errors";
import { canTransitionProject } from "@/server/dispatch/domain";
import {
  createMutationMetadata,
  forbidden,
  notFoundOrInaccessible,
  persistenceFailure,
  type OperationalRecordCreateResult,
  type OperationalRecordListResult,
  type OperationalRecordMutationResult,
} from "./results";
import { operationalRecordScopePredicate } from "./scope";
import {
  lockOperationalOrganization,
  revalidateOperationalActor,
} from "./mutation-context";
import {
  createServiceTypeInputSchema,
  technicianEligibilityInputSchema,
  updateProjectInputSchema,
  updateServiceTypeInputSchema,
  updateTechnicianInputSchema,
  updateWorkOrderInputSchema,
  validationIssues,
} from "./validation";

export async function listServiceTypes(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<ServiceTypeRecord>> {
  if (!hasPermission(context, "service_type.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.organizationId, context.membership.organizationId))
      .orderBy(serviceTypes.name, serviceTypes.key);
    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function createServiceType(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<ServiceTypeRecord>> {
  if (!hasPermission(context, "service_type.manage")) {
    return forbidden();
  }

  const parsed = createServiceTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  const officeId = await resolveMutationOfficeId(db, context, parsed.data.officeId);
  if (!officeId) {
    return notFoundOrInaccessible();
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "service_type.manage",
        officeId,
      );
      if (actorFailure) return actorFailure;

      const [value] = await transaction
        .insert(serviceTypes)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          officeId: parsed.data.officeId ?? null,
          createdByUserId: context.user.id,
          updatedByUserId: context.user.id,
        })
        .returning();

      return {
        status: "created" as const,
        value,
        mutation: createMutationMetadata("service_type.created", context, value.id),
      };
    });
  } catch (error) {
    const info = getPostgresErrorInfo(error);
    return info.code === "23505" &&
      info.constraint === "service_types_organization_key_unique"
      ? { status: "conflict", reason: "service_type_key_already_exists" }
      : persistenceFailure();
  }
}

export async function updateServiceType(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordMutationResult<ServiceTypeRecord>> {
  if (!hasPermission(context, "service_type.manage")) return forbidden();
  const parsed = updateServiceTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  const officeId = await resolveMutationOfficeId(db, context, parsed.data.officeId);
  if (!officeId) return notFoundOrInaccessible();

  try {
    return await db.transaction(async (transaction) => {
      await lockOperationalOrganization(transaction, context.membership.organizationId);
      const actorFailure = await revalidateOperationalActor(
        transaction,
        context,
        "service_type.manage",
        officeId,
      );
      if (actorFailure) return actorFailure;

      const [current] = await transaction
        .select()
        .from(serviceTypes)
        .where(
          and(
            eq(serviceTypes.id, parsed.data.serviceTypeId),
            eq(serviceTypes.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);
      if (!current) return notFoundOrInaccessible();
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (current.status === "archived" && parsed.data.status !== "archived") {
        return { status: "invalid_transition" };
      }

      const [value] = await transaction
        .update(serviceTypes)
        .set({
          officeId: parsed.data.officeId ?? null,
          name: parsed.data.name,
          category: parsed.data.category,
          status: parsed.data.status,
          description: parsed.data.description ?? null,
          updatedByUserId: context.user.id,
          updatedAt: new Date(),
          version: sql`${serviceTypes.version} + 1`,
        })
        .where(
          and(
            eq(serviceTypes.id, current.id),
            eq(serviceTypes.organizationId, context.membership.organizationId),
            eq(serviceTypes.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) return { status: "stale_update" };

      return {
        status: "ok",
        value,
        mutation: createMutationMetadata("service_type.updated", context, value.id),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function updateProject(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordMutationResult<ProjectRecord>> {
  if (!hasPermission(context, "project.manage")) return forbidden();
  const parsed = updateProjectInputSchema.safeParse(input);
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
      if (actorFailure) return actorFailure;

      const [current] = await transaction
        .select()
        .from(projects)
        .where(
          and(
            operationalRecordScopePredicate(
              context.tenantScope,
              projects.organizationId,
              projects.officeId,
            ),
            eq(projects.id, parsed.data.projectId),
          ),
        )
        .limit(1);
      if (!current) return notFoundOrInaccessible();
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };
      if (!canTransitionProject(current.status, parsed.data.status)) {
        return { status: "invalid_transition" };
      }

      const [value] = await transaction
        .update(projects)
        .set({
          officeId: parsed.data.officeId,
          projectNumber: parsed.data.projectNumber,
          name: parsed.data.name,
          address: parsed.data.address ?? null,
          status: parsed.data.status,
          isActive: parsed.data.status === "active",
          updatedAt: new Date(),
          version: sql`${projects.version} + 1`,
        })
        .where(
          and(
            eq(projects.id, current.id),
            eq(projects.organizationId, context.membership.organizationId),
            eq(projects.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) return { status: "stale_update" };

      return {
        status: "ok",
        value,
        mutation: createMutationMetadata("project.updated", context, value.id),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function updateTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordMutationResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.manage")) return forbidden();
  const parsed = updateTechnicianInputSchema.safeParse(input);
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
      if (actorFailure) return actorFailure;

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

      const [current] = await transaction
        .select()
        .from(technicians)
        .where(
          and(
            operationalRecordScopePredicate(
              context.tenantScope,
              technicians.organizationId,
              technicians.officeId,
            ),
            eq(technicians.id, parsed.data.technicianId),
          ),
        )
        .limit(1);
      if (!current) return notFoundOrInaccessible();
      if (current.version !== parsed.data.expectedVersion) return { status: "stale_update" };

      const [value] = await transaction
        .update(technicians)
        .set({
          homeOfficeId: parsed.data.officeId,
          displayName: parsed.data.displayName,
          operationalRole: parsed.data.operationalRole ?? null,
          workEmail: parsed.data.workEmail ?? null,
          workPhone: parsed.data.workPhone ?? null,
          organizationMembershipId: parsed.data.organizationMembershipId ?? null,
          status: parsed.data.status,
          isActive: parsed.data.status === "active",
          updatedAt: new Date(),
          version: sql`${technicians.version} + 1`,
        })
        .where(
          and(
            eq(technicians.id, current.id),
            eq(technicians.organizationId, context.membership.organizationId),
            eq(technicians.version, parsed.data.expectedVersion),
          ),
        )
        .returning();
      if (!value) return { status: "stale_update" };

      await transaction
        .insert(technicianOfficeEligibilities)
        .values({
          organizationId: context.membership.organizationId,
          officeId: parsed.data.officeId,
          technicianId: current.id,
          createdByUserId: context.user.id,
        })
        .onConflictDoNothing();

      return {
        status: "ok",
        value,
        mutation: createMutationMetadata("technician.updated", context, value.id),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function updateWorkOrder(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordMutationResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.manage")) return forbidden();
  const parsed = updateWorkOrderInputSchema.safeParse(input);
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
      if (!["draft", "ready_for_dispatch"].includes(current.status)) {
        return { status: "invalid_transition" };
      }

      const [project] = await transaction
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsed.data.projectId),
            eq(projects.organizationId, context.membership.organizationId),
            eq(projects.officeId, current.officeId),
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
      if (!project || !serviceType) return notFoundOrInaccessible();
      if (serviceType.officeId !== null && serviceType.officeId !== current.officeId) {
        return notFoundOrInaccessible();
      }
      if (serviceType.status !== "active" && serviceType.id !== current.serviceTypeId) {
        return { status: "inactive_reference", reason: "service_type_inactive" };
      }

      const [value] = await transaction
        .update(workOrders)
        .set({
          projectId: parsed.data.projectId,
          serviceTypeId: parsed.data.serviceTypeId,
          serviceType: serviceType.name,
          workOrderNumber: parsed.data.workOrderNumber,
          jobSiteName: parsed.data.jobSiteName,
          priority: parsed.data.priority,
          dispatchInstructions: parsed.data.dispatchInstructions ?? null,
          scheduledStartAt: parsed.data.scheduledStartAt,
          scheduledEndAt: parsed.data.scheduledEndAt,
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
      return {
        status: "ok",
        value,
        mutation: createMutationMetadata("work_order.updated", context, value.id),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

export async function listTechnicianEligibilities(
  db: OperationalDatabase,
  context: AuthorizationContext,
  technicianId: string,
): Promise<OperationalRecordListResult<TechnicianOfficeEligibilityRecord>> {
  if (!hasPermission(context, "technician.read")) return forbidden();
  try {
    const values = await db
      .select()
      .from(technicianOfficeEligibilities)
      .where(
        and(
          eq(
            technicianOfficeEligibilities.organizationId,
            context.membership.organizationId,
          ),
          eq(technicianOfficeEligibilities.technicianId, technicianId),
          operationalRecordScopePredicate(
            context.tenantScope,
            technicianOfficeEligibilities.organizationId,
            technicianOfficeEligibilities.officeId,
          ),
        ),
      )
      .orderBy(technicianOfficeEligibilities.officeId);
    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function addTechnicianEligibility(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<TechnicianOfficeEligibilityRecord>> {
  if (!hasPermission(context, "technician.manage")) return forbidden();
  const parsed = technicianEligibilityInputSchema.safeParse(input);
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
      if (actorFailure) return actorFailure;

      const [technician] = await transaction
        .select({ id: technicians.id })
        .from(technicians)
        .where(
          and(
            eq(technicians.id, parsed.data.technicianId),
            eq(technicians.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);
      if (!technician) return notFoundOrInaccessible();

      const [value] = await transaction
        .insert(technicianOfficeEligibilities)
        .values({
          organizationId: context.membership.organizationId,
          officeId: parsed.data.officeId,
          technicianId: technician.id,
          createdByUserId: context.user.id,
        })
        .returning();
      return {
        status: "created" as const,
        value,
        mutation: createMutationMetadata(
          "technician.eligibility_added",
          context,
          value.id,
        ),
      };
    });
  } catch (error) {
    const info = getPostgresErrorInfo(error);
    return info.code === "23505"
      ? { status: "conflict", reason: "technician_eligibility_already_exists" }
      : persistenceFailure();
  }
}

export async function removeTechnicianEligibility(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordMutationResult<TechnicianOfficeEligibilityRecord>> {
  if (!hasPermission(context, "technician.manage")) return forbidden();
  const parsed = technicianEligibilityInputSchema.safeParse(input);
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
      if (actorFailure) return actorFailure;

      const [technician] = await transaction
        .select({ id: technicians.id, homeOfficeId: technicians.homeOfficeId })
        .from(technicians)
        .where(
          and(
            eq(technicians.id, parsed.data.technicianId),
            eq(technicians.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);
      if (!technician) return notFoundOrInaccessible();
      if (technician.homeOfficeId === parsed.data.officeId) {
        return { status: "invalid_transition" };
      }

      const [activeAssignment] = await transaction
        .select({ id: assignmentTechnicians.id })
        .from(assignmentTechnicians)
        .innerJoin(
          dispatchAssignments,
          eq(assignmentTechnicians.dispatchAssignmentId, dispatchAssignments.id),
        )
        .where(
          and(
            eq(assignmentTechnicians.organizationId, context.membership.organizationId),
            eq(assignmentTechnicians.officeId, parsed.data.officeId),
            eq(assignmentTechnicians.technicianId, parsed.data.technicianId),
            eq(assignmentTechnicians.status, "active"),
            eq(dispatchAssignments.isActive, true),
          ),
        )
        .limit(1);
      if (activeAssignment) return { status: "invalid_transition" };

      const [value] = await transaction
        .delete(technicianOfficeEligibilities)
        .where(
          and(
            eq(
              technicianOfficeEligibilities.organizationId,
              context.membership.organizationId,
            ),
            eq(technicianOfficeEligibilities.officeId, parsed.data.officeId),
            eq(
              technicianOfficeEligibilities.technicianId,
              parsed.data.technicianId,
            ),
          ),
        )
        .returning();
      if (!value) return notFoundOrInaccessible();

      return {
        status: "ok",
        value,
        mutation: createMutationMetadata(
          "technician.eligibility_removed",
          context,
          value.id,
        ),
      };
    });
  } catch {
    return persistenceFailure();
  }
}

async function resolveMutationOfficeId(
  db: OperationalDatabase,
  context: AuthorizationContext,
  requestedOfficeId?: string | null,
): Promise<string | undefined> {
  if (requestedOfficeId) return requestedOfficeId;
  if (context.tenantScope.officeAccess === "restricted") {
    return context.tenantScope.officeIds[0];
  }

  const [office] = await db
    .select({ id: offices.id })
    .from(offices)
    .where(eq(offices.organizationId, context.membership.organizationId))
    .orderBy(offices.code)
    .limit(1);
  return office?.id;
}
