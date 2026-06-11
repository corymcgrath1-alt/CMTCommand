import type { GameAction, GameState, PlayerIndex } from "./types";

export interface BotProfile {
  id: string;
  name: string;
  seat: PlayerIndex;
  enabled: boolean;
}

export function createDefaultBotProfiles(): BotProfile[] {
  return [
    { id: "bot-seat-1", name: "Bot placeholder 1", seat: 1, enabled: false },
    { id: "bot-seat-2", name: "Bot placeholder 2", seat: 2, enabled: false },
    { id: "bot-seat-3", name: "Bot placeholder 3", seat: 3, enabled: false }
  ];
}

export function chooseBotAction(state: GameState, bot: BotProfile): GameAction | null {
  void state;
  void bot;
  return null;
}
