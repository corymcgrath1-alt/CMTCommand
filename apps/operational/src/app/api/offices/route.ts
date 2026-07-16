import { NextResponse } from "next/server";
import { hasPermission } from "@/server/auth/permissions";
import { loadRequestAuthorization } from "@/server/auth/request-context";
import { listAccessibleOffices } from "@/server/tenancy/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { state, db } = await loadRequestAuthorization();

  if (
    state.status !== "authorized" ||
    !db ||
    !hasPermission(state.context, "office.read")
  ) {
    return NextResponse.json(
      { status: "not_found_or_inaccessible" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await listAccessibleOffices(db, state.context.tenantScope);

  if (result.status !== "ok") {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      offices: result.values.map(({ id, code, name, timeZone, status }) => ({
        id,
        code,
        name,
        timeZone,
        status,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
