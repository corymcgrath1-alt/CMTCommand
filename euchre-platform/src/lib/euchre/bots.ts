import { legalActionsForPlayer } from "./rules";
import type { GameAction, GameState, PlayerIndex } from "./types";

export interface BotProfile {
  id: string;
  name: string;
  seat: PlayerIndex;
  enabled: boolean;
}

export function createDefaultBotProfiles(): BotProfile[] {
  return [
    { id: "bot-seat-1", name: "West Bot", seat: 1, enabled: true },
    { id: "bot-seat-2", name: "North Bot", seat: 2, enabled: true },
    { id: "bot-seat-3", name: "East Bot", seat: 3, enabled: true }
  ];
}

export function chooseBotAction(state: GameState, bot: BotProfile): GameAction | null {
  if (!bot.enabled || state.activePlayer !== bot.seat) {
    return null;
  }

  const legal = legalActionsForPlayer(state, bot.seat);

  if (state.phase === "ordering" && legal.canPass) {
    return { type: "PASS", player: bot.seat };
  }

  if (state.phase === "calling") {
    const suit = legal.callableSuits[0];
    if (suit) {
      return { type: "CALL_TRUMP", player: bot.seat, suit };
    }
  }

  if (state.phase === "discarding" && legal.mustDiscard) {
    const card = state.hands[bot.seat][0];
    return card ? { type: "DISCARD", player: bot.seat, card } : null;
  }

  if (state.phase === "playing") {
    const card = legal.playableCards[0];
    return card ? { type: "PLAY_CARD", player: bot.seat, card } : null;
  }

  return null;
}
