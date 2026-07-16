import { listAuditEvents } from "@/server/audit/query-service";
import {
  loadOperationalRequest,
  operationalJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(httpRequest: Request) {
  const request = await loadOperationalRequest();
  if (!request) return unauthorizedJson();

  const url = new URL(httpRequest.url);
  return operationalJson(
    await listAuditEvents(request.db, request.context, compactQuery(url.searchParams)),
  );
}

function compactQuery(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(
    [...searchParams.entries()].filter(([, value]) => value.trim() !== "" && value !== "all"),
  );
}
