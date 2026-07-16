import { listMediaAssetsForAssignment } from "@/server/media/service";
import {
  loadOperationalRequest,
  operationalJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _httpRequest: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { assignmentId } = await params;

  return auth
    ? operationalJson(
        await listMediaAssetsForAssignment(auth.db, auth.context, assignmentId),
      )
    : unauthorizedJson();
}
