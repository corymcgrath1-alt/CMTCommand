import { NextResponse } from "next/server";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { findAccessibleOfficeById } from "@/server/tenancy/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ officeId: string }> },
) {
  const { officeId } = await params;
  const { state, db } = await loadRequestAuthorization();

  if (
    state.status !== "authorized" ||
    !db ||
    !hasPermission(state.context, "office.read")
  ) {
    return notFound();
  }

  const result = await findAccessibleOfficeById(
    db,
    state.context.tenantScope,
    { officeId },
  );

  if (result.status !== "found") {
    return result.status === "persistence_error"
      ? NextResponse.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        )
      : notFound();
  }

  const { id, code, name, timeZone, status } = result.value;
  return NextResponse.json(
    { status: "found", office: { id, code, name, timeZone, status } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
function notFound() {
  return NextResponse.json(
    { status: "not_found_or_inaccessible" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
