import type { AuditEventRecord } from "@/server/db/schema";

export type OperationalRecordConflictReason =
  | "project_source_already_exists"
  | "service_type_key_already_exists"
  | "technician_source_already_exists"
  | "technician_eligibility_already_exists"
  | "work_order_source_already_exists"
  | "dispatch_assignment_source_already_exists";

export type OperationalRecordMutationAction =
  | "service_type.created"
  | "service_type.updated"
  | "project.created"
  | "project.updated"
  | "technician.created"
  | "technician.updated"
  | "technician.eligibility_added"
  | "technician.eligibility_removed"
  | "work_order.created"
  | "work_order.updated"
  | "work_order.transitioned"
  | "dispatch_assignment.created"
  | "dispatch_assignment.transitioned"
  | "dispatch_assignment.primary_assigned"
  | "dispatch_assignment.support_added"
  | "dispatch_assignment.technician_removed"
  | "dispatch_assignment.schedule_updated"
  | "dispatch_assignment.acknowledged"
  | "media_upload.initiated"
  | "media_upload.completed"
  | "media_upload.failed"
  | "media_access.granted";

export type OperationalRecordMutationMetadata = {
  mutationId: string;
  requestId: string;
  correlationId: string;
  action: OperationalRecordMutationAction;
  actorUserId: string;
  organizationId: string;
  subjectId: string;
  occurredAt: string;
};

export type OperationalRecordFailure =
  | {
      status: "validation_error";
      issues: string[];
    }
  | {
      status: "forbidden";
      reason: "missing_permission";
    }
  | {
      status: "not_found_or_inaccessible";
    }
  | {
      status: "conflict";
      reason: OperationalRecordConflictReason;
    }
  | {
      status: "stale_update";
    }
  | {
      status: "invalid_transition";
    }
  | {
      status: "inactive_reference";
      reason: "service_type_inactive" | "technician_inactive";
    }
  | {
      status: "persistence_error";
      reason: "database_error";
    };

export type OperationalRecordCreateResult<T> =
  | {
      status: "created";
      value: T;
      mutation: OperationalRecordMutationMetadata;
    }
  | OperationalRecordFailure;

export type OperationalRecordMutationResult<T> =
  | {
      status: "ok";
      value: T;
      mutation: OperationalRecordMutationMetadata;
    }
  | OperationalRecordFailure;

export type OperationalRecordLookupResult<T> =
  | {
      status: "found";
      value: T;
    }
  | OperationalRecordFailure;

export type OperationalRecordListResult<T> =
  | {
      status: "ok";
      values: T[];
    }
  | OperationalRecordFailure;

export function forbidden(): OperationalRecordFailure {
  return { status: "forbidden", reason: "missing_permission" };
}

export function notFoundOrInaccessible(): OperationalRecordFailure {
  return { status: "not_found_or_inaccessible" };
}

export function persistenceFailure(): OperationalRecordFailure {
  return { status: "persistence_error", reason: "database_error" };
}

export function createMutationMetadata(
  action: OperationalRecordMutationAction,
  subjectId: string,
  event: AuditEventRecord,
): OperationalRecordMutationMetadata {
  return {
    mutationId: event.id,
    requestId: event.requestId ?? event.id,
    correlationId: event.correlationId ?? event.id,
    action,
    actorUserId: event.actorUserId,
    organizationId: event.organizationId,
    subjectId,
    occurredAt: event.occurredAt.toISOString(),
  };
}
