import { Buffer } from "node:buffer";
import { getServerEnv } from "@/lib/env/server";
import { getDatabase } from "@/server/db/client";
import { storeMediaUploadObject } from "@/server/media/service";
import { operationalJson } from "@/server/http/operational-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  httpRequest: Request,
  { params }: { params: Promise<{ uploadSessionId: string }> },
) {
  const env = getServerEnv();
  if (!env.DATABASE_URL) {
    return operationalJson({
      status: "persistence_error",
      reason: "database_error",
    });
  }

  const { uploadSessionId } = await params;
  const token = new URL(httpRequest.url).searchParams.get("token");
  const body = Buffer.from(await httpRequest.arrayBuffer());
  return operationalJson(
    await storeMediaUploadObject(
      getDatabase(env.DATABASE_URL),
      uploadSessionId,
      token,
      body,
      httpRequest.headers.get("content-type"),
    ),
  );
}
