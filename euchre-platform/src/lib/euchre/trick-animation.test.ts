import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import { buildCurrentTrickView } from "./table-view";
import {
  TRICK_CLEAR_DELAY_MS,
  TRICK_RESOLVE_DELAY_MS,
  buildLatestCompletedTrickKey,
  buildTrickAnimationState,
  createInitialTrickPresentationState,
  getSeatTrickSlot,
  getTrickWinnerPresentation,
  shouldPresentLatestCompletedTrick
} from "./trick-animation";
import type { Card, GameState } from "./types";

const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

describe("trick animation view model", () => {
  it("maps each player to a fixed trick landing slot", () => {
    expect([0, 1, 2, 3].map((seat) => getSeatTrickSlot(seat as 0 | 1 | 2 | 3))).toEqual([
      "south-slot",
      "west-slot",
      "north-slot",
      "east-slot"
    ]);
  });

  it("builds a placing phase for an in-progress trick", () => {
    const trick = buildCurrentTrickView(makePlayingState({
      currentTrick: {
        leader: 1,
        plays: [{ player: 1, card: c("A", "hearts") }]
      }
    }));

    const animation = buildTrickAnimationState(trick);

    expect(animation.phase).toBe("placing");
    expect(animation.cards).toEqual([
      expect.objectContaining({ seat: 1, slot: "west-slot", cardLabel: "AH", playOrder: 0 })
    ]);
    expect(animation.placementDurationMs).toBeGreaterThanOrEqual(200);
  });

  it("builds a deterministic collecting phase with winner and target", () => {
    const trick = buildCurrentTrickView(makePlayingState({
      completedTricks: [{
        leader: 1,
        plays: [
          { player: 1, card: c("A", "hearts") },
          { player: 2, card: c("J", "clubs") },
          { player: 3, card: c("K", "hearts") },
          { player: 0, card: c("9", "hearts") }
        ],
        winner: 2
      }],
      currentTrick: {
        leader: 2,
        plays: []
      }
    }), { showLatestCompleted: true });

    const animation = buildTrickAnimationState(trick);

    expect(animation.phase).toBe("collecting");
    expect(animation.collectTarget).toBe("north-pile");
    expect(animation.winner.summaryText).toBe("North wins trick with JC");
    expect(animation.cards.map((card) => card.animationDelayMs)).toEqual([0, 55, 110, 165]);
  });

  it("surfaces next leader during completed trick presentation", () => {
    const trick = buildCurrentTrickView(makePlayingState({
      completedTricks: [{
        leader: 0,
        plays: [
          { player: 0, card: c("A", "spades") },
          { player: 1, card: c("9", "spades") },
          { player: 2, card: c("10", "spades") },
          { player: 3, card: c("K", "spades") }
        ],
        winner: 0
      }],
      currentTrick: {
        leader: 0,
        plays: []
      }
    }), { showLatestCompleted: true });

    expect(getTrickWinnerPresentation(trick)).toMatchObject({
      winnerSeat: 0,
      nextLeaderSeat: 0,
      nextLeaderLabel: "South"
    });
  });

  it("builds a stable key for the latest completed trick", () => {
    const state = makePlayingState({
      completedTricks: [{
        leader: 3,
        plays: [
          { player: 3, card: c("J", "spades") },
          { player: 0, card: c("9", "spades") },
          { player: 1, card: c("A", "spades") },
          { player: 2, card: c("K", "spades") }
        ],
        winner: 3
      }]
    });

    expect(buildLatestCompletedTrickKey(state)).toBe("1:1:3:3-J-spades|0-9-spades|1-A-spades|2-K-spades");
  });

  it("presents only uncleared completed tricks", () => {
    const key = "1:1:3:3-J-spades|0-9-spades|1-A-spades|2-K-spades";
    const initial = createInitialTrickPresentationState();

    expect(shouldPresentLatestCompletedTrick(key, initial.clearedKey)).toBe(true);
    expect(shouldPresentLatestCompletedTrick(key, key)).toBe(false);
    expect(shouldPresentLatestCompletedTrick(null, key)).toBe(false);
  });

  it("uses a readable winner pause before clearing the trick", () => {
    expect(TRICK_RESOLVE_DELAY_MS).toBeGreaterThanOrEqual(900);
    expect(TRICK_RESOLVE_DELAY_MS).toBeLessThanOrEqual(1200);
    expect(TRICK_CLEAR_DELAY_MS).toBeGreaterThan(0);
    expect(TRICK_CLEAR_DELAY_MS).toBeLessThanOrEqual(250);
  });
});

function makePlayingState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(),
    phase: "playing",
    handNumber: 1,
    dealer: 0,
    activePlayer: 1,
    trump: "spades",
    maker: 1,
    makerTeam: 1,
    currentTrick: {
      leader: 1,
      plays: []
    },
    ...overrides
  };
}
