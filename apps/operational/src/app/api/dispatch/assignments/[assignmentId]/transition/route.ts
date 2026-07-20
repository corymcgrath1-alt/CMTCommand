import { transitionAssignment } from "@/server/dispatch/service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  httpRequest: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  return mutateAssignment(httpRequest, params, transitionAssignment);
}

export async function mutateAssignment(
  httpRequest: Request,
  params: Promise<{ assignmentId: string }>,
  operation: typeof transitionAssignment,
) {
  const auth = await loadOperationalRequest();
  const { assignmentId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await operation(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          assignmentId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
