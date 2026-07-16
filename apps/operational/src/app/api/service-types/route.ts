import {
  createServiceType,
  listServiceTypes,
} from "@/server/operational-records/catalog-service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const request = await loadOperationalRequest();
  return request
    ? operationalJson(await listServiceTypes(request.db, request.context))
    : unauthorizedJson();
}

export async function POST(httpRequest: Request) {
  const request = await loadOperationalRequest();
  return request
    ? operationalJson(
        await createServiceType(
          request.db,
          request.context,
          await readJson(httpRequest),
        ),
      )
    : unauthorizedJson();
}
