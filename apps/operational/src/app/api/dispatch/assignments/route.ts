import { listDispatchBoard } from "@/server/dispatch/service";
import { createDispatchAssignment } from "@/server/operational-records/service";
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
    ? operationalJson(await listDispatchBoard(request.db, request.context))
    : unauthorizedJson();
}

export async function POST(httpRequest: Request) {
  const request = await loadOperationalRequest();
  return request
    ? operationalJson(
        await createDispatchAssignment(
          request.db,
          request.context,
          await readJson(httpRequest),
        ),
      )
    : unauthorizedJson();
}
