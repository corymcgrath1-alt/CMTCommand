import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalEventStore, resetEventStoreForTests } from "@/lib/persistence/event-store";
import { POST as createGame } from "./games/route";
import { GET as loadGame } from "./games/[gameId]/route";
import { POST as appendEvent } from "./games/[gameId]/events/route";

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
