import {
  addTechnicianEligibility,
  listTechnicianEligibilities,
  removeTechnicianEligibility,
} from "@/server/operational-records/catalog-service";
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
    ? operationalJson(
        await listTechnicianEligibilities(auth.db, auth.context, technicianId),
      )
    : unauthorizedJson();
}

export async function POST(
  httpRequest: Request,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  return mutate(httpRequest, params, addTechnicianEligibility);
}

export async function DELETE(
  httpRequest: Request,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  return mutate(httpRequest, params, removeTechnicianEligibility);
}

async function mutate(
  httpRequest: Request,
  params: Promise<{ technicianId: string }>,
  operation: typeof addTechnicianEligibility | typeof removeTechnicianEligibility,
) {
  const auth = await loadOperationalRequest();
  const { technicianId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await operation(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          technicianId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
