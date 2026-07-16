import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadRequestAuthorization } from "@/server/auth/request-context";

export async function loadOperationalRequest() {
  const request = await loadRequestAuthorization();
  if (request.state.status !== "authorized" || !request.db) return null;
  return { context: request.state.context, db: request.db };
}

export function operationalJson(
  result: { status: string; mutation?: { requestId?: string } } & Record<string, unknown>,
) {
  const statusByResult: Record<string, number> = {
    created: 201,
    ok: 200,
    found: 200,
    validation_error: 400,
    forbidden: 403,
    not_found_or_inaccessible: 404,
    conflict: 409,
    schedule_conflict: 409,
    stale_update: 409,
    invalid_transition: 409,
    inactive_reference: 409,
    persistence_error: 503,
  };
  const requestId = result.mutation?.requestId ?? randomUUID();
  return NextResponse.json(
    { ...result, requestId },
    {
      status: statusByResult[result.status] ?? 500,
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function unauthorizedJson() {
  const requestId = randomUUID();
  return NextResponse.json(
    { status: "unauthenticated", requestId },
    {
      status: 401,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    },
  );
}
