import { describe, expect, it } from "vitest";
import { createInitialGameState, createMoveEvent } from "./engine";
import {
  buildCurrentTrickView,
  buildHumanHandView,
  buildTableSeatViews,
  buildTableStatusView
} from "./table-view";
import type { Card, GameState, MoveEvent } from "./types";

const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

describe("table seat view models", () => {
  it("labels seats around the table and marks dealer, actor, and caller roles", () => {
    const state = makeState({
      phase: "playing",
      dealer: 2,
      activePlayer: 1,
      maker: 3,
      makerTeam: 1,
      moveLog: [
        move({ type: "PASS", player: 1 }),
        move({ type: "CALL_TRUMP", player: 3, suit: "spades" })
      ]
    });

    const seats = buildTableSeatViews(state);

    expect(seats.map((seat) => [seat.seat, seat.name, seat.position])).toEqual([
      [0, "South", "south"],
      [1, "West", "west"],
      [2, "North", "north"],
      [3, "East", "east"]
    ]);
    expect(seats.find((seat) => seat.seat === 2)).toMatchObject({ isDealer: true });
    expect(seats.find((seat) => seat.seat === 1)).toMatchObject({ isActive: true, recentAction: "West passed." });
    expect(seats.find((seat) => seat.seat === 3)).toMatchObject({ isCaller: true, isMaker: true });
    expect(seats.find((seat) => seat.seat === 1)).toMatchObject({ isPartnerOfCaller: true, isMaker: true });
  });
});

describe("table status view models", () => {
  it("summarizes score, phase, dealer, trump, and trick score", () => {
    const state = makeState({
      phase: "ordering",
      handNumber: 2,
      scores: [4, 3],
      dealer: 1,
      activePlayer: 2,
      upcard: c("J", "hearts"),
      trump: "hearts",
      makerTeam: 0,
      tricksWon: [2, 1]
    });

    expect(buildTableStatusView(state)).toMatchObject({
      handLabel: "Hand 2",
      scoreLabel: "Team 0 4 - 3 Team 1",
      phaseLabel: "Ordering",
      dealerLabel: "West",
      activePlayerLabel: "North",
      trumpLabel: "hearts",
      upcardLabel: "JH",
      makersLabel: "Team 0",
      trickScoreLabel: "2 - 1"
    });
  });
});

describe("current trick view models", () => {
  it("keeps cards in played order and identifies led suit, unplayed seats, and current winner", () => {
    const state = makeState({
      phase: "playing",
      trump: "spades",
      completedTricks: [
        { leader: 0, plays: [], winner: 2 }
      ],
      currentTrick: {
        leader: 1,
        plays: [
          { player: 1, card: c("A", "hearts") },
          { player: 2, card: c("J", "clubs") },
          { player: 3, card: c("K", "hearts") }
        ]
      }
    });

    const view = buildCurrentTrickView(state);

    expect(view).toMatchObject({
      trickNumber: 2,
      leaderSeat: 1,
      leaderLabel: "West",
      ledSuitLabel: "hearts",
      trumpLabel: "spades",
      currentWinnerSeat: 2,
      currentWinnerLabel: "North",
      winningCardLabel: "JC",
      latestCompletedWinnerLabel: "North"
    });
    expect(view.plays.map((play) => play.cardLabel)).toEqual(["AH", "JC", "KH"]);
    expect(view.plays.find((play) => play.seat === 2)).toMatchObject({ isTrump: true, isWinningCard: true });
    expect(view.unplayedSeats).toEqual([0]);
  });
});

describe("human hand view models", () => {
  it("marks legal follow-suit cards during play", () => {
    const state = makeState({
      phase: "playing",
      activePlayer: 0,
      trump: "spades",
      hands: {
        0: [c("9", "hearts"), c("A", "clubs"), c("J", "clubs")]
      },
      currentTrick: {
        leader: 1,
        plays: [{ player: 1, card: c("A", "hearts") }]
      }
    });

    const view = buildHumanHandView(state);

    expect(view.helperText).toContain("must follow hearts");
    expect(view.cards.map((card) => [card.label, card.legal])).toEqual([
      ["9H", true],
      ["AC", false],
      ["JC", false]
    ]);
  });

  it("marks every card as selectable when the human must discard", () => {
    const state = makeState({
      phase: "discarding",
      activePlayer: 0,
      dealer: 0,
      hands: {
        0: [c("9", "hearts"), c("A", "clubs"), c("J", "clubs"), c("K", "spades"), c("Q", "diamonds"), c("10", "clubs")]
      }
    });

    const view = buildHumanHandView(state);

    expect(view.mustDiscard).toBe(true);
    expect(view.cards.every((card) => card.legal)).toBe(true);
    expect(view.actionLabel).toBe("Choose a discard");
  });
});

type StateOverrides = Omit<Partial<GameState>, "config" | "hands"> & {
  config?: Partial<GameState["config"]>;
  hands?: Partial<GameState["hands"]>;
};

function makeState(overrides: StateOverrides = {}): GameState {
  const base = createInitialGameState(overrides.config);
  return {
    ...base,
    ...overrides,
    config: { ...base.config, ...overrides.config },
    hands: {
      ...base.hands,
      ...overrides.hands
    }
  };
}

function move(action: MoveEvent["action"], sequence = 0): MoveEvent {
  return createMoveEvent(action, sequence);
}
