import { findProjectById } from "@/server/operational-records/service";
import { updateProject } from "@/server/operational-records/catalog-service";
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
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { projectId } = await params;
  return auth
    ? operationalJson(await findProjectById(auth.db, auth.context, projectId))
    : unauthorizedJson();
}

export async function PATCH(
  httpRequest: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { projectId } = await params;
  const body = await readJson(httpRequest);
  return auth
    ? operationalJson(
        await updateProject(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          projectId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
