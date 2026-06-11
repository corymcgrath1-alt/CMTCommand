import { compareCardsForSort, removeCard, sameCard } from "./cards";
import { dealHands, nextPlayer, teamOf } from "./deck";
import {
  canPlayCard,
  determineTrickWinner,
  scoreHand,
  validateCardInHand,
  validCallerSuits
} from "./rules";
import type {
  BidDecision,
  Card,
  GameAction,
  GameConfig,
  GameState,
  MoveEvent,
  PlayerIndex,
  Suit,
  Trick
} from "./types";

const DEFAULT_CONFIG: GameConfig = {
  stickDealer: false,
  targetScore: 10
};

export function createInitialGameState(config: Partial<GameConfig> = {}): GameState {
  return {
    id: cryptoSafeId(),
    config: { ...DEFAULT_CONFIG, ...config },
    phase: "idle",
    handNumber: 0,
    dealer: 0,
    activePlayer: 1,
    scores: [0, 0],
    hands: {
      0: [],
      1: [],
      2: [],
      3: []
    },
    kitty: [],
    bids: [],
    currentTrick: null,
    completedTricks: [],
    tricksWon: [0, 0],
    moveLog: []
  };
}

export function createMoveEvent(action: GameAction, sequence: number): MoveEvent {
  return {
    id: `move_${sequence}_${Date.now()}`,
    sequence,
    action,
    player: "player" in action ? action.player : undefined,
    createdAt: new Date().toISOString()
  };
}

export function applyMoveEvent(state: GameState, event: MoveEvent): GameState {
  const nextState = reduceGameAction(state, event.action);
  return {
    ...nextState,
    moveLog: [...nextState.moveLog, event]
  };
}

export function dispatchAction(state: GameState, action: GameAction): GameState {
  return applyMoveEvent(state, createMoveEvent(action, state.moveLog.length));
}

export function replayMoveLog(events: MoveEvent[], config: Partial<GameConfig> = {}): GameState {
  return events.reduce((state, event) => applyMoveEvent(state, event), createInitialGameState(config));
}

export function reduceGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RESET_GAME":
      return createInitialGameState(state.config);
    case "START_HAND":
      if (state.phase !== "idle") {
        throw new Error("A new game hand can only start from idle");
      }
      return startHand(state, state.dealer, action.seed, state.handNumber + 1);
    case "NEXT_HAND":
      if (state.phase !== "handComplete" && state.phase !== "gameComplete") {
        throw new Error("The next hand can only start after a hand is complete");
      }
      if (state.phase === "gameComplete") {
        throw new Error("The game is already complete");
      }
      return startHand(state, nextPlayer(state.dealer), action.seed, state.handNumber + 1);
    case "PASS":
      return pass(state, action.player);
    case "ORDER_UP":
      return orderUp(state, action.player, Boolean(action.alone));
    case "CALL_TRUMP":
      return callTrump(state, action.player, action.suit, Boolean(action.alone));
    case "DISCARD":
      return discard(state, action.player, action.card);
    case "PLAY_CARD":
      return playCard(state, action.player, action.card);
    default:
      return assertNever(action);
  }
}

function startHand(state: GameState, dealer: PlayerIndex, seed: number, handNumber: number): GameState {
  const dealt = dealHands(seed);
  const sortedHands = sortHands(dealt.hands);
  const upcard = dealt.kitty[0];

  return {
    ...state,
    phase: "ordering",
    handNumber,
    dealer,
    activePlayer: nextPlayer(dealer),
    hands: sortedHands,
    kitty: dealt.kitty,
    upcard,
    turnedDownSuit: upcard.suit,
    trump: undefined,
    maker: undefined,
    makerTeam: undefined,
    lonePlayer: undefined,
    bids: [],
    currentTrick: null,
    completedTricks: [],
    tricksWon: [0, 0],
    handResult: undefined
  };
}

function pass(state: GameState, player: PlayerIndex): GameState {
  assertActivePlayer(state, player);

  if (state.phase === "ordering") {
    const bids = [...state.bids, bid(1, player, "pass")];
    if (bids.filter((candidate) => candidate.round === 1 && candidate.decision === "pass").length === 4) {
      return {
        ...state,
        phase: "calling",
        activePlayer: nextPlayer(state.dealer),
        bids
      };
    }

    return {
      ...state,
      activePlayer: nextPlayer(player),
      bids
    };
  }

  if (state.phase === "calling") {
    const roundTwoPasses = state.bids.filter((candidate) => candidate.round === 2 && candidate.decision === "pass").length;
    if (state.config.stickDealer && player === state.dealer && roundTwoPasses === 3) {
      throw new Error("Stick the dealer is enabled; dealer must call trump");
    }

    const bids = [...state.bids, bid(2, player, "pass")];
    if (bids.filter((candidate) => candidate.round === 2 && candidate.decision === "pass").length === 4) {
      return {
        ...state,
        phase: "handComplete",
        activePlayer: nextPlayer(state.dealer),
        bids,
        handResult: undefined
      };
    }

    return {
      ...state,
      activePlayer: nextPlayer(player),
      bids
    };
  }

  throw new Error(`Cannot pass during ${state.phase}`);
}

function orderUp(state: GameState, player: PlayerIndex, alone: boolean): GameState {
  assertActivePlayer(state, player);
  assertPhase(state, "ordering");
  if (!state.upcard) {
    throw new Error("Cannot order up without an upcard");
  }

  const dealerHand = [...state.hands[state.dealer], state.upcard].sort(compareCardsForSort);

  return {
    ...state,
    phase: "discarding",
    activePlayer: state.dealer,
    trump: state.upcard.suit,
    maker: player,
    makerTeam: teamOf(player),
    lonePlayer: alone ? player : undefined,
    hands: {
      ...state.hands,
      [state.dealer]: dealerHand
    },
    bids: [...state.bids, bid(1, player, "order-up", state.upcard.suit, alone)]
  };
}

function callTrump(state: GameState, player: PlayerIndex, suit: Suit, alone: boolean): GameState {
  assertActivePlayer(state, player);
  assertPhase(state, "calling");
  if (!state.turnedDownSuit) {
    throw new Error("Cannot call trump without a turned down suit");
  }
  if (!validCallerSuits(state.turnedDownSuit).includes(suit)) {
    throw new Error(`Cannot call ${suit}; ${state.turnedDownSuit} was turned down`);
  }

  return beginPlay({
    ...state,
    trump: suit,
    maker: player,
    makerTeam: teamOf(player),
    lonePlayer: alone ? player : undefined,
    bids: [...state.bids, bid(2, player, "call", suit, alone)]
  });
}

function discard(state: GameState, player: PlayerIndex, card: Card): GameState {
  assertActivePlayer(state, player);
  assertPhase(state, "discarding");
  if (player !== state.dealer) {
    throw new Error("Only the dealer can discard after pickup");
  }
  validateCardInHand(state.hands[player], card);

  const dealerHand = removeCard(state.hands[player], card).sort(compareCardsForSort);
  if (dealerHand.length !== 5) {
    throw new Error("Dealer must discard back to five cards");
  }

  return beginPlay({
    ...state,
    hands: {
      ...state.hands,
      [player]: dealerHand
    }
  });
}

function beginPlay(state: GameState): GameState {
  if (!state.trump || state.maker === undefined || state.makerTeam === undefined) {
    throw new Error("Cannot begin play without trump and makers");
  }

  const leader = nextPlayer(state.dealer);
  return {
    ...state,
    phase: "playing",
    activePlayer: leader,
    currentTrick: {
      leader,
      plays: []
    }
  };
}

function playCard(state: GameState, player: PlayerIndex, card: Card): GameState {
  assertActivePlayer(state, player);
  assertPhase(state, "playing");
  if (!state.trump || !state.currentTrick) {
    throw new Error("Cannot play before trump and trick are set");
  }

  if (!canPlayCard(state.hands[player], card, state.currentTrick, state.trump)) {
    throw new Error("Illegal play: player must follow suit when able");
  }

  const updatedHands = {
    ...state.hands,
    [player]: removeCard(state.hands[player], card)
  };
  const currentTrick: Trick = {
    ...state.currentTrick,
    plays: [...state.currentTrick.plays, { player, card }]
  };

  if (currentTrick.plays.length < 4) {
    return {
      ...state,
      hands: updatedHands,
      currentTrick,
      activePlayer: nextPlayer(player)
    };
  }

  const winner = determineTrickWinner(currentTrick, state.trump);
  const completedTrick = {
    ...currentTrick,
    winner
  };
  const winnerTeam = teamOf(winner);
  const tricksWon: [number, number] = [...state.tricksWon];
  tricksWon[winnerTeam] += 1;
  const completedTricks = [...state.completedTricks, completedTrick];

  if (completedTricks.length === 5) {
    return completeHand({
      ...state,
      hands: updatedHands,
      completedTricks,
      tricksWon,
      currentTrick: null,
      activePlayer: winner
    });
  }

  return {
    ...state,
    hands: updatedHands,
    completedTricks,
    tricksWon,
    currentTrick: {
      leader: winner,
      plays: []
    },
    activePlayer: winner
  };
}

function completeHand(state: GameState): GameState {
  if (!state.trump || state.maker === undefined || state.makerTeam === undefined) {
    throw new Error("Cannot score a hand without trump and makers");
  }

  const handResult = scoreHand({
    makerTeam: state.makerTeam,
    maker: state.maker,
    trump: state.trump,
    tricksWon: state.tricksWon,
    lonePlayer: state.lonePlayer
  });
  const scores: [number, number] = [
    state.scores[0] + handResult.pointsAwarded[0],
    state.scores[1] + handResult.pointsAwarded[1]
  ];

  return {
    ...state,
    phase: scores.some((score) => score >= state.config.targetScore) ? "gameComplete" : "handComplete",
    scores,
    handResult
  };
}

function sortHands(hands: Record<PlayerIndex, Card[]>): Record<PlayerIndex, Card[]> {
  return {
    0: [...hands[0]].sort(compareCardsForSort),
    1: [...hands[1]].sort(compareCardsForSort),
    2: [...hands[2]].sort(compareCardsForSort),
    3: [...hands[3]].sort(compareCardsForSort)
  };
}

function bid(
  round: 1 | 2,
  player: PlayerIndex,
  decision: BidDecision["decision"],
  suit?: Suit,
  alone?: boolean
): BidDecision {
  return {
    round,
    player,
    decision,
    suit,
    alone
  };
}

function assertActivePlayer(state: GameState, player: PlayerIndex): void {
  if (state.activePlayer !== player) {
    throw new Error(`Player ${player} cannot act now; expected player ${state.activePlayer}`);
  }
}

function assertPhase(state: GameState, phase: GameState["phase"]): void {
  if (state.phase !== phase) {
    throw new Error(`Expected phase ${phase}; got ${state.phase}`);
  }
}

function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `game_${Date.now()}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
}

export function findCard(hand: Card[], card: Card): Card {
  const found = hand.find((candidate) => sameCard(candidate, card));
  if (!found) {
    throw new Error("Card not found");
  }
  return found;
}
