import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InvalidGameActionError, legalActionsForPlayer } from "@/lib/euchre";
import { LocalEventStore, resetEventStoreForTests } from "@/lib/persistence/event-store";
import { apiError } from "./_shared";
import { POST as createGame } from "./games/route";
import { GET as loadGame } from "./games/[gameId]/route";
import { POST as appendEvent } from "./games/[gameId]/events/route";
import { GET as reviewGame } from "./games/[gameId]/review/route";
import { GET as profileAggregates } from "./profiles/route";

const testDirs: string[] = [];

afterEach(async () => {
  resetEventStoreForTests(null);
  await Promise.all(testDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("API route validation", () => {
  it("returns 400 for malformed JSON on POST /api/games", async () => {
    const response = await createGame(jsonRequest("{bad json"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Malformed JSON request body" });
  });

  it("returns 400 for malformed JSON on POST /api/games/[gameId]/events", async () => {
    const response = await appendEvent(
      jsonRequest("{bad json"),
      routeContext("missing-game")
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Malformed JSON request body" });
  });

  it("keeps invalid structured payloads at 400", async () => {
    const response = await createGame(jsonRequest({
      config: {
        stickDealer: "false",
        targetScore: -1
      }
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid request");
    expect(body.issues).toHaveLength(2);
  });

  it("keeps duplicate move sequences at 409", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);
    const game = await store.createGame({ config: { stickDealer: false, targetScore: 10 } });

    const first = await appendEvent(
      jsonRequest({ expectedSequence: 0, action: { type: "START_HAND", seed: 123 } }),
      routeContext(game.id)
    );
    const duplicate = await appendEvent(
      jsonRequest({ expectedSequence: 0, action: { type: "PASS", player: 1 } }),
      routeContext(game.id)
    );
    const body = await duplicate.json();

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(body.error).toContain("already exists");
  });

  it("keeps missing game loads at 404", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);

    const response = await loadGame(new Request("http://localhost/api/games/missing"), routeContext("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Game missing was not found" });
  });

  it("returns 409 for invalid game state transitions", async () => {
    const response = apiError(new InvalidGameActionError("The game is already complete"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "The game is already complete" });
  });

  it("returns a review summary for a completed game", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);
    const game = await store.createGame({ config: { stickDealer: false, targetScore: 2 } });
    await store.appendMove({ gameId: game.id, expectedSequence: 0, action: { type: "START_HAND", seed: 123 } });
    await completeOneHand(store, game.id);

    const response = await reviewGame(new Request(`http://localhost/api/games/${game.id}/review`), routeContext(game.id));
    const body = await response.json();
    const loaded = await store.loadGame(game.id);

    expect(response.status).toBe(200);
    expect(body.review.gameId).toBe(game.id);
    expect(body.review.finalScore).toEqual(loaded.state.scores);
    expect(body.review.winningTeam).toBe(0);
    expect(body.review.totalHandsPlayed).toBe(1);
    expect(body.review.totalTricksPlayed).toBe(5);
  }, 15_000);

  it("returns 404 for missing game review", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);

    const response = await reviewGame(new Request("http://localhost/api/games/missing/review"), routeContext("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Game missing was not found" });
  });

  it("returns 409 for incomplete game review", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);
    const game = await store.createGame({ config: { stickDealer: false, targetScore: 10 } });
    await store.appendMove({ gameId: game.id, expectedSequence: 0, action: { type: "START_HAND", seed: 123 } });

    const response = await reviewGame(new Request(`http://localhost/api/games/${game.id}/review`), routeContext(game.id));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Game review is available after game completion" });
  });

  it("returns local profile aggregates from completed game history", async () => {
    const store = await createStore();
    resetEventStoreForTests(store);
    const game = await store.createGame({ config: { stickDealer: false, targetScore: 2 } });
    await store.appendMove({ gameId: game.id, expectedSequence: 0, action: { type: "START_HAND", seed: 123 } });
    await completeOneHand(store, game.id);

    const response = await profileAggregates();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profiles.completedGames).toBe(1);
    expect(body.profiles.sourceGameIds).toEqual([game.id]);
    expect(body.profiles.players[0]).toMatchObject({
      name: "South / Human",
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      winPercentage: 100
    });
    expect(body.profiles.teams[0]).toMatchObject({
      gamesPlayed: 1,
      wins: 1,
      losses: 0
    });
  }, 15_000);

});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function routeContext(gameId: string) {
  return {
    params: Promise.resolve({ gameId })
  };
}

async function createStore(): Promise<LocalEventStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "euchre-api-store-"));
  testDirs.push(dir);
  return new LocalEventStore(path.join(dir, "events.json"));
}

async function completeOneHand(store: LocalEventStore, gameId: string): Promise<void> {
  let loaded = await store.loadGame(gameId);
  const actions = [
    { type: "ORDER_UP", player: 1 },
    { type: "DISCARD", player: 0, card: loaded.state.hands[0][0] }
  ] as const;

  for (const action of actions) {
    await store.appendMove({ gameId, expectedSequence: loaded.events.length, action });
    loaded = await store.loadGame(gameId);
  }

  while (loaded.state.phase === "playing") {
    const player = loaded.state.activePlayer;
    const card = legalActionsForPlayer(loaded.state, player).playableCards[0];
    await store.appendMove({
      gameId,
      expectedSequence: loaded.events.length,
      action: { type: "PLAY_CARD", player, card }
    });
    loaded = await store.loadGame(gameId);
  }
}
