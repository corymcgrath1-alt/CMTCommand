import { beginMediaUpload } from "@/server/media/service";
import {
  loadOperationalRequest,
  operationalJson,
  readJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  httpRequest: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { assignmentId } = await params;
  const body = await readJson(httpRequest);

  return auth
    ? operationalJson(
        await beginMediaUpload(auth.db, auth.context, {
          ...(isObject(body) ? body : {}),
          assignmentId,
        }),
      )
    : unauthorizedJson();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
