export type ConflictReason =
  | "organization_slug_already_exists"
  | "office_code_already_exists";

export type ValidationFailure = {
  status: "validation_error";
  issues: string[];
};

export type PersistenceFailure = {
  status: "persistence_error";
  reason: "database_error";
};

export type ConflictFailure = {
  status: "conflict";
  reason: ConflictReason;
};

export type NotFoundOrInaccessible = {
  status: "not_found_or_inaccessible";
};

export type CreateResult<T> =
  | {
      status: "created";
      value: T;
    }
  | ConflictFailure
  | NotFoundOrInaccessible
  | ValidationFailure
  | PersistenceFailure;

export type LookupResult<T> =
  | {
      status: "found";
      value: T;
    }
  | NotFoundOrInaccessible
  | ValidationFailure
  | PersistenceFailure;

export type ListResult<T> =
  | {
      status: "ok";
      values: T[];
    }
  | ValidationFailure
  | PersistenceFailure;

export type PostgresErrorInfo = {
  code?: string;
  constraint?: string;
};

const MAX_ERROR_CAUSE_DEPTH = 4;

export function getPostgresErrorInfo(error: unknown): PostgresErrorInfo {
  let current: unknown = error;
  const seen = new Set<object>();

  for (let depth = 0; depth < MAX_ERROR_CAUSE_DEPTH; depth += 1) {
    if (!isRecord(current)) {
      return {};
    }

    if (seen.has(current)) {
      return {};
    }

    seen.add(current);

    const info = readPostgresErrorInfo(current);

    if (info.code || info.constraint) {
      return info;
    }

    if (!("cause" in current)) {
      return {};
    }

    current = current.cause;
  }

  return {};
}

export function databaseFailure(): PersistenceFailure {
  return {
    status: "persistence_error",
    reason: "database_error",
  };
}

export function notFoundOrInaccessible(): NotFoundOrInaccessible {
  return {
    status: "not_found_or_inaccessible",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readPostgresErrorInfo(error: Record<string, unknown>): PostgresErrorInfo {
  return {
    code: typeof error.code === "string" ? error.code : undefined,
    constraint: typeof error.constraint === "string" ? error.constraint : undefined,
  };
}
