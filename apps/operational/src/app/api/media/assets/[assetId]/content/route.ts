import { getServerEnv } from "@/lib/env/server";
import { getDatabase } from "@/server/db/client";
import { operationalJson } from "@/server/http/operational-route";
import { readGrantedMediaObject } from "@/server/media/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  httpRequest: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const env = getServerEnv();
  if (!env.DATABASE_URL) {
    return operationalJson({
      status: "persistence_error",
      reason: "database_error",
    });
  }

  const { assetId } = await params;
  const url = new URL(httpRequest.url);
  const result = await readGrantedMediaObject(
    getDatabase(env.DATABASE_URL),
    assetId,
    url.searchParams.get("variant") ?? "original",
    url.searchParams.get("token"),
  );

  if (result.status !== "ok") return operationalJson(result);

  const body = new ArrayBuffer(result.body.byteLength);
  new Uint8Array(body).set(result.body);

  return new Response(body, {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
      "content-length": String(result.byteSize),
      "content-type": result.mediaType,
    },
  });
}
