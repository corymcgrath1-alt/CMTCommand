import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DuplicateSequenceError,
  GameNotFoundError,
  MoveOrderingError
} from "@/lib/persistence/event-store";

const cardSchema = z.object({
  suit: z.enum(["clubs", "diamonds", "hearts", "spades"]),
  rank: z.enum(["9", "10", "J", "Q", "K", "A"])
});

export const gameConfigSchema = z.object({
  stickDealer: z.boolean(),
  targetScore: z.number().int().positive()
});

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("START_HAND"),
    seed: z.number().int()
  }),
  z.object({
    type: z.literal("PASS"),
    player: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
  }),
  z.object({
    type: z.literal("ORDER_UP"),
    player: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    alone: z.boolean().optional()
  }),
  z.object({
    type: z.literal("CALL_TRUMP"),
    player: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    suit: z.enum(["clubs", "diamonds", "hearts", "spades"]),
    alone: z.boolean().optional()
  }),
  z.object({
    type: z.literal("DISCARD"),
    player: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    card: cardSchema
  }),
  z.object({
    type: z.literal("PLAY_CARD"),
    player: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    card: cardSchema
  }),
  z.object({
    type: z.literal("NEXT_HAND"),
    seed: z.number().int()
  }),
  z.object({
    type: z.literal("RESET_GAME")
  })
]);

export function apiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
  }

  if (error instanceof GameNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof DuplicateSequenceError || error instanceof MoveOrderingError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
