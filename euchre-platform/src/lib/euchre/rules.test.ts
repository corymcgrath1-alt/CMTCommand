import { describe, expect, it } from "vitest";
import { effectiveSuit, isLeftBower, isRightBower } from "./cards";
import { createInitialGameState, dispatchAction, replayMoveLog } from "./engine";
import {
  canPlayCard,
  determineTrickWinner,
  legalActionsForPlayer,
  playableCards,
  scoreHand
} from "./rules";
import type { Card, GameState, PlayerIndex, Trick } from "./types";

const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

describe("bower handling", () => {
  it("treats the right bower as trump", () => {
    expect(isRightBower(c("J", "hearts"), "hearts")).toBe(true);
    expect(effectiveSuit(c("J", "hearts"), "hearts")).toBe("hearts");
  });

  it("treats the left bower as the trump suit", () => {
    const left = c("J", "diamonds");

    expect(isLeftBower(left, "hearts")).toBe(true);
    expect(effectiveSuit(left, "hearts")).toBe("hearts");
  });
});

describe("follow suit validation", () => {
  it("requires a player to follow the effective led suit when able", () => {
    const trick: Trick = {
      leader: 0,
      plays: [{ player: 0, card: c("9", "clubs") }]
    };
    const hand = [c("A", "clubs"), c("A", "hearts")];

    expect(canPlayCard(hand, c("A", "hearts"), trick, "spades")).toBe(false);
    expect(canPlayCard(hand, c("A", "clubs"), trick, "spades")).toBe(true);
  });

  it("uses left bower suit for follow-suit checks", () => {
    const trick: Trick = {
      leader: 0,
      plays: [{ player: 0, card: c("J", "diamonds") }]
    };
    const hand = [c("9", "hearts"), c("A", "clubs")];

    expect(playableCards(hand, trick, "hearts")).toEqual([c("9", "hearts")]);
  });

  it("does not let the left bower follow its printed suit", () => {
    const trick: Trick = {
      leader: 0,
      plays: [{ player: 0, card: c("A", "diamonds") }]
    };
    const hand = [c("J", "diamonds"), c("9", "clubs")];

    expect(canPlayCard(hand, c("9", "clubs"), trick, "hearts")).toBe(true);
  });
});

describe("trick winner logic", () => {
  it("ranks right bower above left bower and other trump cards", () => {
    const trick: Trick = {
      leader: 0,
      plays: [
        { player: 0, card: c("A", "hearts") },
        { player: 1, card: c("J", "diamonds") },
        { player: 2, card: c("J", "hearts") },
        { player: 3, card: c("9", "hearts") }
      ]
    };

    expect(determineTrickWinner(trick, "hearts")).toBe(2);
  });

  it("lets trump beat the led suit", () => {
    const trick: Trick = {
      leader: 0,
      plays: [
        { player: 0, card: c("A", "clubs") },
        { player: 1, card: c("9", "clubs") },
        { player: 2, card: c("9", "spades") },
        { player: 3, card: c("K", "clubs") }
      ]
    };

    expect(determineTrickWinner(trick, "spades")).toBe(2);
  });
});

describe("scoring", () => {
  it("awards makers one point for three or four tricks", () => {
    expect(
      scoreHand({
        makerTeam: 0,
        maker: 0,
        trump: "clubs",
        tricksWon: [3, 2]
      }).pointsAwarded
    ).toEqual([1, 0]);
  });

  it("awards makers two points for a non-lone march", () => {
    expect(
      scoreHand({
        makerTeam: 1,
        maker: 1,
        trump: "clubs",
        tricksWon: [0, 5]
      }).pointsAwarded
    ).toEqual([0, 2]);
  });

  it("awards four points for a lone march", () => {
    expect(
      scoreHand({
        makerTeam: 1,
        maker: 1,
        trump: "clubs",
        tricksWon: [0, 5],
        lonePlayer: 1
      }).pointsAwarded
    ).toEqual([0, 4]);
  });

  it("awards one point for a lone hand that wins three or four tricks", () => {
    expect(
      scoreHand({
        makerTeam: 0,
        maker: 0,
        trump: "clubs",
        tricksWon: [4, 1],
        lonePlayer: 0
      }).pointsAwarded
    ).toEqual([1, 0]);
  });

  it("awards defenders two points for a euchre", () => {
    expect(
      scoreHand({
        makerTeam: 0,
        maker: 0,
        trump: "clubs",
        tricksWon: [2, 3]
      }).pointsAwarded
    ).toEqual([0, 2]);
  });
});

describe("state machine", () => {
  it("deals a 24-card Euchre hand with an upcard", () => {
    const state = dispatchAction(createInitialGameState(), { type: "START_HAND", seed: 42 });

    expect(state.phase).toBe("ordering");
    expect(Object.values(state.hands).flat()).toHaveLength(20);
    expect(state.kitty).toHaveLength(4);
    expect(state.upcard).toBeDefined();
    expect(state.activePlayer).toBe(1);
  });

  it("moves from ordering to dealer discard when trump is ordered up", () => {
    let state = dispatchAction(createInitialGameState(), { type: "START_HAND", seed: 42 });
    state = dispatchAction(state, { type: "ORDER_UP", player: 1 });

    expect(state.phase).toBe("discarding");
    expect(state.trump).toBe(state.upcard?.suit);
    expect(state.hands[state.dealer]).toHaveLength(6);
    expect(state.activePlayer).toBe(state.dealer);
  });

  it("lets dealer discard and starts play left of dealer", () => {
    let state = dispatchAction(createInitialGameState(), { type: "START_HAND", seed: 42 });
    state = dispatchAction(state, { type: "ORDER_UP", player: 1 });
    const discard = state.hands[state.dealer][0];
    state = dispatchAction(state, { type: "DISCARD", player: state.dealer, card: discard });

    expect(state.phase).toBe("playing");
    expect(state.hands[state.dealer]).toHaveLength(5);
    expect(state.currentTrick?.leader).toBe(1);
  });

  it("enforces stick the dealer in the second round", () => {
    let state = dispatchAction(createInitialGameState({ stickDealer: true }), { type: "START_HAND", seed: 10 });

    for (const player of [1, 2, 3, 0] as PlayerIndex[]) {
      state = dispatchAction(state, { type: "PASS", player });
    }

    for (const player of [1, 2, 3] as PlayerIndex[]) {
      state = dispatchAction(state, { type: "PASS", player });
    }

    expect(legalActionsForPlayer(state, 0).canPass).toBe(false);
    expect(() => dispatchAction(state, { type: "PASS", player: 0 })).toThrow(/Stick the dealer/);
  });

  it("stores all actions as replayable move events", () => {
    let state = dispatchAction(createInitialGameState(), { type: "START_HAND", seed: 42 });
    state = dispatchAction(state, { type: "ORDER_UP", player: 1, alone: true });
    state = dispatchAction(state, { type: "DISCARD", player: 0, card: state.hands[0][0] });

    const replayed = replayMoveLog(state.moveLog);

    expect(replayed.phase).toBe(state.phase);
    expect(replayed.trump).toBe(state.trump);
    expect(replayed.lonePlayer).toBe(1);
    expect(replayed.hands).toEqual(state.hands);
  });

  it("scores a completed hand after five tricks", () => {
    const state = makePlayingState([
      [c("A", "clubs"), c("K", "clubs"), c("Q", "clubs"), c("10", "clubs"), c("9", "clubs")],
      [c("9", "diamonds"), c("10", "diamonds"), c("Q", "diamonds"), c("K", "diamonds"), c("A", "diamonds")],
      [c("9", "hearts"), c("10", "hearts"), c("Q", "hearts"), c("K", "hearts"), c("A", "hearts")],
      [c("9", "spades"), c("10", "spades"), c("Q", "spades"), c("K", "spades"), c("A", "spades")]
    ]);

    const finished = [
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3]
    ].reduce((current, trickPlayers) => {
      return trickPlayers.reduce((inner, player) => {
        const card = inner.hands[player as PlayerIndex][0];
        return dispatchAction(inner, { type: "PLAY_CARD", player: player as PlayerIndex, card });
      }, current);
    }, state);

    expect(finished.phase).toBe("handComplete");
    expect(finished.handResult?.pointsAwarded).toEqual([2, 0]);
    expect(finished.scores).toEqual([2, 0]);
  });
});

function makePlayingState(hands: [Card[], Card[], Card[], Card[]]): GameState {
  return {
    ...createInitialGameState(),
    phase: "playing",
    handNumber: 1,
    dealer: 3,
    activePlayer: 0,
    trump: "clubs",
    maker: 0,
    makerTeam: 0,
    hands: {
      0: hands[0],
      1: hands[1],
      2: hands[2],
      3: hands[3]
    },
    currentTrick: {
      leader: 0,
      plays: []
    }
  };
}
