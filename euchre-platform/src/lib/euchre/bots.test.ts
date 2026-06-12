import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalEventStore } from "@/lib/persistence/event-store";
import { chooseBotAction, createDefaultBotProfiles } from "./bots";
import { createInitialGameState, dispatchAction } from "./engine";
import { legalActionsForPlayer } from "./rules";
import type { GameAction, GameState } from "./types";

const testDirs: string[] = [];

afterEach(async () => {
  await Promise.all(testDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("placeholder bot actions", () => {
  it("passes during first-round ordering", () => {
    const state = dispatchAction(createInitialGameState(), { type: "START_HAND", seed: 42 });
    const bot = createDefaultBotProfiles()[0];

    expect(chooseBotAction(state, bot)).toEqual({ type: "PASS", player: 1 });
  });

  it("can drive a persisted hand from deal through scoring with a human seat", async () => {
    const store = await createStore();
    const bots = createDefaultBotProfiles();
    const game = await store.createGame({ config: { stickDealer: false, targetScore: 10 } });
    await store.appendMove({
      gameId: game.id,
      expectedSequence: 0,
      action: { type: "START_HAND", seed: 24680 }
    });

    let loaded = await store.loadGame(game.id);
    for (let index = 0; index < 80 && loaded.state.phase !== "handComplete"; index += 1) {
      const action = chooseNextAction(loaded.state, bots);
      expect(action).not.toBeNull();
      await store.appendMove({
        gameId: game.id,
        expectedSequence: loaded.events.length,
        action: action as GameAction
      });
      loaded = await store.loadGame(game.id);
    }

    expect(loaded.state.phase).toBe("handComplete");
    expect(loaded.state.handResult).toBeDefined();
    expect(loaded.state.completedTricks).toHaveLength(5);
    expect(loaded.state.hands[0]).toHaveLength(0);
    expect(loaded.events.map((event) => event.sequenceNumber)).toEqual(
      loaded.events.map((_, index) => index)
    );
    expect(loaded.state.moveLog).toHaveLength(loaded.events.length);
  });
});

function chooseNextAction(state: GameState, bots = createDefaultBotProfiles()): GameAction | null {
  const bot = bots.find((candidate) => candidate.seat === state.activePlayer);
  if (bot) {
    return chooseBotAction(state, bot);
  }

  const legal = legalActionsForPlayer(state, 0);
  if (state.phase === "ordering" && legal.canPass) {
    return { type: "PASS", player: 0 };
  }

  if (state.phase === "calling") {
    if (legal.canPass) {
      return { type: "PASS", player: 0 };
    }

    const suit = legal.callableSuits[0];
    return suit ? { type: "CALL_TRUMP", player: 0, suit } : null;
  }

  if (state.phase === "discarding") {
    const card = state.hands[0][0];
    return card ? { type: "DISCARD", player: 0, card } : null;
  }

  if (state.phase === "playing") {
    const card = legal.playableCards[0];
    return card ? { type: "PLAY_CARD", player: 0, card } : null;
  }

  return null;
}

async function createStore(): Promise<LocalEventStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "euchre-bot-store-"));
  testDirs.push(dir);
  return new LocalEventStore(path.join(dir, "events.json"));
}
