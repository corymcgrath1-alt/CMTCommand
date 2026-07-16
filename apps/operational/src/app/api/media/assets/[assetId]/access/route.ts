import { createMediaReadGrant } from "@/server/media/service";
import {
  loadOperationalRequest,
  operationalJson,
  unauthorizedJson,
} from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  httpRequest: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const auth = await loadOperationalRequest();
  const { assetId } = await params;
  const url = new URL(httpRequest.url);
  const baseUrl = url.origin;

  return auth
    ? operationalJson(
        await createMediaReadGrant(
          auth.db,
          auth.context,
          assetId,
          url.searchParams.get("variant") ?? "original",
          baseUrl,
        ),
      )
    : unauthorizedJson();
}
