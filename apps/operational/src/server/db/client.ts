import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let poolDatabaseUrl: string | null = null;
let database: NodePgDatabase<typeof schema> | null = null;

export type OperationalDatabase = NodePgDatabase<typeof schema>;

export function getDatabasePool(databaseUrl: string): Pool {
  const trimmedDatabaseUrl = databaseUrl.trim();

  if (trimmedDatabaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required for database operations.");
  }

  if (pool && poolDatabaseUrl === trimmedDatabaseUrl) {
    return pool;
  }

  if (pool) {
    throw new Error("Database pool is already initialized for this process.");
  }

  pool = new Pool({
    connectionString: trimmedDatabaseUrl,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    application_name: "cmtcommand_operational",
  });
  poolDatabaseUrl = trimmedDatabaseUrl;

  return pool;
}

export function getDatabase(databaseUrl: string): OperationalDatabase {
  if (!database) {
    database = drizzle(getDatabasePool(databaseUrl), { schema });
  }

  return database;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }

  pool = null;
  poolDatabaseUrl = null;
  database = null;
}
