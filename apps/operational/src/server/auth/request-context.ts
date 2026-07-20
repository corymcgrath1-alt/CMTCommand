import { getServerEnv } from "@/lib/env/server";
import { getDatabase, type OperationalDatabase } from "@/server/db/client";
import { createAuthorizationRepository } from "./repository";
import { readRequestSession } from "./request-session";
import { resolveAuthorizationState } from "./resolver";
import type { AuthorizationState } from "./types";

export type RequestAuthorizationResult = {
  state: AuthorizationState;
  db?: OperationalDatabase;
};

export async function loadRequestAuthorization(): Promise<RequestAuthorizationResult> {
  const requestSession = await readRequestSession();

  if (requestSession.status === "unavailable") {
    return {
      state: { status: "auth_unavailable", reason: requestSession.reason },
    };
  }

  if (requestSession.status === "unauthenticated") {
    return { state: { status: "unauthenticated" } };
  }

  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    return {
      state: { status: "auth_unavailable", reason: "database_not_configured" },
    };
  }

  try {
    const db = getDatabase(env.DATABASE_URL);
    const state = await resolveAuthorizationState(
      createAuthorizationRepository(db),
      requestSession.session,
    );
    return { state, db };
  } catch {
    return {
      state: { status: "auth_unavailable", reason: "authorization_unavailable" },
    };
  }
}
