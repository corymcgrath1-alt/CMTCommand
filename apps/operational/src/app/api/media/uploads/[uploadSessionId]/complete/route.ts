import { completeMediaUpload } from "@/server/media/service";
import {
  loadOperationalRequest,
  operationalJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _httpRequest: Request,
  { params }: { params: Promise<{ uploadSessionId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { uploadSessionId } = await params;

  return auth
    ? operationalJson(
        await completeMediaUpload(auth.db, auth.context, uploadSessionId),
      )
    : unauthorizedJson();
}
