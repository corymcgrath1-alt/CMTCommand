import { NextResponse } from "next/server";
import { getReadiness, getReadinessHttpStatus } from "@/server/health/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const readiness = await getReadiness();

  if (readiness.status === "not_ready" && readiness.reason === "database_unavailable") {
    console.warn(
      JSON.stringify({
        event: "readiness_check_failed",
        reason: readiness.reason,
        service: readiness.service,
      }),
    );
  }

  return NextResponse.json(readiness, {
    status: getReadinessHttpStatus(readiness),
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
