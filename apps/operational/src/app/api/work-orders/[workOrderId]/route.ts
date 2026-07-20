import { findWorkOrderById } from "@/server/operational-records/service";
import { updateWorkOrder } from "@/server/operational-records/catalog-service";
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
  { params }: { params: Promise<{ workOrderId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { workOrderId } = await params;
  return auth
    ? operationalJson(await findWorkOrderById(auth.db, auth.context, workOrderId))
    : unauthorizedJson();
}

export async function PATCH(
  httpRequest: Request,
  { params }: { params: Promise<{ workOrderId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { workOrderId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await updateWorkOrder(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          workOrderId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
