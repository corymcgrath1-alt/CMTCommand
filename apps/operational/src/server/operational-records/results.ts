export type OperationalRecordConflictReason =
  | "project_source_already_exists"
  | "technician_source_already_exists"
  | "work_order_source_already_exists"
  | "dispatch_assignment_source_already_exists";

export type OperationalRecordMutationAction =
  | "project.created"
  | "technician.created"
  | "work_order.created"
  | "dispatch_assignment.created";

export type OperationalRecordMutationMetadata = {
  mutationId: string;
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
