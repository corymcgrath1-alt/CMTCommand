import { getServerEnv, ServerEnvError, type ServerEnv } from "@/lib/env/server";
import {
  checkDatabaseConnectivity,
  type DatabaseConnectivityResult,
  type DatabaseUnavailableReason,
} from "@/server/db/check";

export const SERVICE_NAME = "cmtcommand-operational";

export type LivenessResult = {
  status: "ok";
  service: typeof SERVICE_NAME;
};

export type ReadinessResult =
  | {
      status: "ready";
      service: typeof SERVICE_NAME;
      checks: {
        database: "ok";
      };
    }
  | {
      status: "not_ready";
      service: typeof SERVICE_NAME;
      reason: DatabaseUnavailableReason;
      checks: {
        database: "not_configured" | "unavailable";
      };
    };

export function getLiveness(): LivenessResult {
  return {
    status: "ok",
    service: SERVICE_NAME,
  };
}

export async function getReadiness({
  env,
  checkDatabase = checkDatabaseConnectivity,
}: {
  env?: Pick<ServerEnv, "DATABASE_URL">;
  checkDatabase?: typeof checkDatabaseConnectivity;
} = {}): Promise<ReadinessResult> {
  const databaseUrlResult = readDatabaseUrl(env);

  if (databaseUrlResult.status === "invalid") {
    return toNotReady("database_not_configured");
  }

  const databaseResult = await checkDatabase({
    databaseUrl: databaseUrlResult.databaseUrl,
  });

  return toReadinessResult(databaseResult);
}

export function getReadinessHttpStatus(result: ReadinessResult): 200 | 503 {
  return result.status === "ready" ? 200 : 503;
}

function readDatabaseUrl(
  env: Pick<ServerEnv, "DATABASE_URL"> | undefined,
):
  | {
      status: "ok";
      databaseUrl?: string;
    }
  | {
      status: "invalid";
    } {
  if (env) {
    return {
      status: "ok",
      databaseUrl: env.DATABASE_URL,
    };
  }

  try {
    return {
      status: "ok",
      databaseUrl: getServerEnv().DATABASE_URL,
    };
  } catch (error) {
    if (error instanceof ServerEnvError) {
      return {
        status: "invalid",
      };
    }

    throw error;
  }
}

function toReadinessResult(result: DatabaseConnectivityResult): ReadinessResult {
  if (result.status === "ok") {
    return {
      status: "ready",
      service: SERVICE_NAME,
      checks: {
        database: "ok",
      },
    };
  }

  return toNotReady(result.reason);
}

function toNotReady(reason: DatabaseUnavailableReason): ReadinessResult {
  return {
    status: "not_ready",
    service: SERVICE_NAME,
    reason,
    checks: {
      database:
        reason === "database_not_configured" ? "not_configured" : "unavailable",
    },
  };
}
