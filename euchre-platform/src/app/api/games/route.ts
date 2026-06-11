import { NextResponse } from "next/server";
import { getEventStore } from "@/lib/persistence/event-store";
import { apiError, gameConfigSchema } from "../_shared";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = gameConfigSchema.parse(body.config);
    const game = await getEventStore().createGame({
      config: parsed,
      metadata: body.metadata ?? {}
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
