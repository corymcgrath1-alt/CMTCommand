import { updateServiceType } from "@/server/operational-records/catalog-service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  httpRequest: Request,
  { params }: { params: Promise<{ serviceTypeId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { serviceTypeId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await updateServiceType(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          serviceTypeId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
