import { sql } from "drizzle-orm";
import { getDatabase } from "./client";

export type DatabaseUnavailableReason =
  | "database_not_configured"
  | "database_unavailable";

export type DatabaseConnectivityResult =
  | {
      status: "ok";
    }
  | {
      status: "unavailable";
      reason: DatabaseUnavailableReason;
    };

export type DatabaseProbe = (databaseUrl: string) => Promise<void>;

export async function checkDatabaseConnectivity({
  databaseUrl,
  probe = executeSelectOne,
}: {
  databaseUrl?: string;
  probe?: DatabaseProbe;
}): Promise<DatabaseConnectivityResult> {
  const trimmedDatabaseUrl = databaseUrl?.trim();

  if (!trimmedDatabaseUrl) {
    return {
      status: "unavailable",
      reason: "database_not_configured",
    };
  }

  try {
    await probe(trimmedDatabaseUrl);
    return {
      status: "ok",
    };
  } catch {
    return {
      status: "unavailable",
      reason: "database_unavailable",
    };
  }
}

async function executeSelectOne(databaseUrl: string): Promise<void> {
  const db = getDatabase(databaseUrl);
  await db.execute(sql`select 1`);
}
