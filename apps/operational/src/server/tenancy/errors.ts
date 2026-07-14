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

export function getPostgresErrorInfo(error: unknown): PostgresErrorInfo {
  if (!error || typeof error !== "object") {
    return {};
  }

  const maybeError = error as { code?: unknown; constraint?: unknown };

  return {
    code: typeof maybeError.code === "string" ? maybeError.code : undefined,
    constraint:
      typeof maybeError.constraint === "string" ? maybeError.constraint : undefined,
  };
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
