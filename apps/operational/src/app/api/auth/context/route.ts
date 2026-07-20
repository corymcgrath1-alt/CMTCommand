import { NextResponse } from "next/server";
import { loadRequestAuthorization } from "@/server/auth/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { state } = await loadRequestAuthorization();

  if (state.status !== "authorized") {
    const httpStatus = state.status === "unauthenticated" ? 401 : 403;
    return NextResponse.json(
      { status: state.status },
      { status: httpStatus, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      status: "authorized",
      user: {
        displayName: state.context.user.displayName,
        email: state.context.user.email,
      },
      organization: {
        name: state.context.membership.organizationName,
      },
      role: state.context.membership.role,
      officeAccess: state.context.tenantScope.officeAccess,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
