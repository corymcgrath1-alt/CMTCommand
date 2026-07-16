import { removeAssignmentTechnician } from "@/server/dispatch/service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  httpRequest: Request,
  {
    params,
  }: { params: Promise<{ assignmentId: string; technicianId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { assignmentId, technicianId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await removeAssignmentTechnician(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          assignmentId,
          technicianId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
