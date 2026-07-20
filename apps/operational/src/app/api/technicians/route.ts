import {
  createTechnician,
  listTechnicians,
} from "@/server/operational-records/service";
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
    ? operationalJson(await listTechnicians(request.db, request.context))
    : unauthorizedJson();
}

export async function POST(httpRequest: Request) {
  const request = await loadOperationalRequest();
  return request
    ? operationalJson(
        await createTechnician(
          request.db,
          request.context,
          await readJson(httpRequest),
        ),
      )
    : unauthorizedJson();
}
