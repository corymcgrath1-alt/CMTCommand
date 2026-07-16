import { findTechnicianById } from "@/server/operational-records/service";
import { updateTechnician } from "@/server/operational-records/catalog-service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { technicianId } = await params;
  return auth
    ? operationalJson(await findTechnicianById(auth.db, auth.context, technicianId))
    : unauthorizedJson();
}

export async function PATCH(
  httpRequest: Request,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { technicianId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await updateTechnician(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          technicianId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
