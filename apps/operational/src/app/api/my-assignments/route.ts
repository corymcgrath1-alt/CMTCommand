import { listMyAssignments } from "@/server/dispatch/service";
import {
  loadOperationalRequest,
  operationalJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const request = await loadOperationalRequest();
  return request
    ? operationalJson(await listMyAssignments(request.db, request.context))
    : unauthorizedJson();
}
