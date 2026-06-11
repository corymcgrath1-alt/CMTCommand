"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cardId,
  cardLabel,
  createDefaultBotProfiles,
  createInitialGameState,
  legalActionsForPlayer,
  type Card,
  type GameAction,
  type GameState,
  type MoveEvent,
  type PlayerIndex
} from "@/lib/euchre";
import type { LoadedGame } from "@/lib/persistence/event-store";

const STORAGE_KEY = "euchre-platform-active-game-id";
const PLAYER_NAMES: Record<PlayerIndex, string> = {
  0: "South",
  1: "West",
  2: "North",
  3: "East"
};

export default function Home() {
  const [stickDealer, setStickDealer] = useState(false);
  const [state, setState] = useState<GameState>(() => createInitialGameState({ stickDealer }));
  const [alone, setAlone] = useState(false);
  const [persistedGameId, setPersistedGameId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Local state ready");
  const bots = useMemo(() => createDefaultBotProfiles(), []);

  useEffect(() => {
    const savedGameId = window.localStorage.getItem(STORAGE_KEY);
    if (!savedGameId) {
      return;
    }

    void loadPersistedGame(savedGameId);
  }, []);

  async function loadPersistedGame(gameId: string) {
    setIsSaving(true);
    setStatus("Loading saved game events...");
    try {
      const loaded = await fetchJson<LoadedGame>(`/api/games/${gameId}`);
      setPersistedGameId(loaded.game.id);
      setStickDealer(loaded.game.config.stickDealer);
      setState(loaded.state);
      setStatus(`Restored ${loaded.events.length} persisted event${loaded.events.length === 1 ? "" : "s"}`);
      window.localStorage.setItem(STORAGE_KEY, loaded.game.id);
    } catch (error) {
      setPersistedGameId(null);
      window.localStorage.removeItem(STORAGE_KEY);
      setStatus(error instanceof Error ? error.message : "Unable to restore saved game");
    } finally {
      setIsSaving(false);
    }
  }

  async function act(action: GameAction) {
    if (!persistedGameId) {
      setStatus("Create a persisted game before playing moves");
      return;
    }

    setIsSaving(true);
    try {
      const result = await fetchJson<Pick<LoadedGame, "game" | "state">>(`/api/games/${persistedGameId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedSequence: state.moveLog.length,
          action
        })
      });
      setState(result.state);
      setStatus(`Persisted event #${result.state.moveLog.length - 1}`);
      setAlone(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Move could not be persisted");
    } finally {
      setIsSaving(false);
    }
  }

  async function startNewGame() {
    setIsSaving(true);
    setStatus("Creating persisted game...");
    try {
      const created = await fetchJson<{ game: LoadedGame["game"] }>("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { stickDealer, targetScore: 10 },
          metadata: { source: "local-phase-1-ui" }
        })
      });
      setPersistedGameId(created.game.id);
      window.localStorage.setItem(STORAGE_KEY, created.game.id);

      const started = await fetchJson<Pick<LoadedGame, "state">>(`/api/games/${created.game.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedSequence: 0,
          action: { type: "START_HAND", seed: Date.now() % 1_000_000 }
        })
      });
      setState(started.state);
      setStatus(`Persisted game ${created.game.id}`);
      setAlone(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create persisted game");
    } finally {
      setIsSaving(false);
    }
  }

  function resetGame() {
    const next = createInitialGameState({ stickDealer, targetScore: 10 });
    setState(next);
    setPersistedGameId(null);
    setAlone(false);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("Local state reset; persisted events were left immutable");
  }

  return (
    <main className="min-h-screen bg-[#071411]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Phase 1 foundation</p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Euchre Platform</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <input
                type="checkbox"
                checked={stickDealer}
                disabled={state.phase !== "idle"}
                onChange={(event) => setStickDealer(event.target.checked)}
              />
              Stick dealer
            </label>
            <button
              className="rounded bg-brass px-4 py-2 text-sm font-semibold text-[#201602]"
              disabled={isSaving}
              onClick={state.phase === "idle" ? startNewGame : resetGame}
            >
              {state.phase === "idle" ? "Start hand" : "Reset"}
            </button>
          </div>
        </header>

        <section className="rounded border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          <span className="font-semibold text-white">Persistence:</span>{" "}
          {persistedGameId ? `Game ${persistedGameId}` : "No persisted game selected"} | {status}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-4">
            <GameSummary state={state} />
            <BiddingControls state={state} alone={alone} setAlone={setAlone} act={act} disabled={isSaving} />
            <div className="grid gap-3 md:grid-cols-2">
              {([0, 1, 2, 3] as PlayerIndex[]).map((player) => (
                <PlayerPanel key={player} player={player} state={state} act={act} disabled={isSaving} />
              ))}
            </div>
            <TrickTable state={state} />
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Bot placeholders</h2>
              <div className="mt-3 space-y-2">
                {bots.map((bot) => (
                  <div key={bot.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm">
                    <span>{bot.name}</span>
                    <span className="text-white/45">Seat {bot.seat}</span>
                  </div>
                ))}
              </div>
            </section>

            <MoveHistory moves={state.moveLog} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function GameSummary({ state }: { state: GameState }) {
  return (
    <section className="grid gap-3 rounded border border-white/10 bg-table p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="Score" value={`Team 0 ${state.scores[0]} - ${state.scores[1]} Team 1`} />
      <SummaryItem label="Phase" value={state.phase} />
      <SummaryItem label="Dealer" value={PLAYER_NAMES[state.dealer]} />
      <SummaryItem label="Active" value={PLAYER_NAMES[state.activePlayer]} />
      <SummaryItem label="Upcard" value={state.upcard ? cardLabel(state.upcard) : "None"} />
      <SummaryItem label="Trump" value={state.trump ?? "Not set"} />
      <SummaryItem label="Makers" value={state.makerTeam === undefined ? "None" : `Team ${state.makerTeam}`} />
      <SummaryItem label="Tricks" value={`${state.tricksWon[0]} - ${state.tricksWon[1]}`} />
      {state.handResult ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="rounded border border-brass/40 bg-brass/10 px-3 py-2 text-sm text-brass">
            Hand scored: Team 0 +{state.handResult.pointsAwarded[0]}, Team 1 +{state.handResult.pointsAwarded[1]}
          </p>
        </div>
      ) : null}
      {state.phase === "handComplete" && !state.handResult ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
            Hand passed out. Deal rotates on the next hand.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-white/45">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function BiddingControls({
  state,
  alone,
  setAlone,
  act,
  disabled
}: {
  state: GameState;
  alone: boolean;
  setAlone: (value: boolean) => void;
  act: (action: GameAction) => void;
  disabled: boolean;
}) {
  if (state.phase === "idle") {
    return null;
  }

  if (state.phase === "handComplete") {
    return (
      <section className="rounded border border-white/10 bg-white/[0.04] p-4">
        <button
          className="rounded bg-white px-4 py-2 text-sm font-semibold text-[#071411]"
          disabled={disabled}
          onClick={() => act({ type: "NEXT_HAND", seed: Date.now() % 1_000_000 })}
        >
          Deal next hand
        </button>
      </section>
    );
  }

  if (state.phase === "gameComplete") {
    return (
      <section className="rounded border border-brass/40 bg-brass/10 p-4 text-brass">
        Game complete. Reset to start a new local game.
      </section>
    );
  }

  if (state.phase !== "ordering" && state.phase !== "calling") {
    return null;
  }

  const legal = legalActionsForPlayer(state, state.activePlayer);

  return (
    <section className="flex flex-col gap-3 rounded border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-white">{PLAYER_NAMES[state.activePlayer]} to bid</span>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={alone} onChange={(event) => setAlone(event.target.checked)} />
          Alone
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border border-white/20 px-3 py-2 text-sm text-white"
          disabled={disabled || !legal.canPass}
          onClick={() => act({ type: "PASS", player: state.activePlayer })}
        >
          Pass
        </button>
        {state.phase === "ordering" ? (
          <button
            className="rounded bg-brass px-3 py-2 text-sm font-semibold text-[#201602]"
            disabled={disabled || !legal.canOrderUp}
            onClick={() => act({ type: "ORDER_UP", player: state.activePlayer, alone })}
          >
            Order up {state.upcard ? state.upcard.suit : ""}
          </button>
        ) : null}
        {state.phase === "calling"
          ? legal.callableSuits.map((suit) => (
              <button
                key={suit}
                className="rounded bg-brass px-3 py-2 text-sm font-semibold text-[#201602]"
                disabled={disabled}
                onClick={() => act({ type: "CALL_TRUMP", player: state.activePlayer, suit, alone })}
              >
                Call {suit}
              </button>
            ))
          : null}
      </div>
    </section>
  );
}

function PlayerPanel({
  player,
  state,
  act,
  disabled
}: {
  player: PlayerIndex;
  state: GameState;
  act: (action: GameAction) => void;
  disabled: boolean;
}) {
  const legal = legalActionsForPlayer(state, player);
  const playable = new Set(legal.playableCards.map(cardId));
  const isActive = state.activePlayer === player;

  function onCard(card: Card) {
    if (legal.mustDiscard) {
      act({ type: "DISCARD", player, card });
      return;
    }

    if (playable.has(cardId(card))) {
      act({ type: "PLAY_CARD", player, card });
    }
  }

  return (
    <section className={`rounded border p-4 ${isActive ? "border-brass bg-felt" : "border-white/10 bg-white/[0.04]"}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-white">{PLAYER_NAMES[player]}</h2>
          <p className="text-xs uppercase tracking-[0.12em] text-white/45">Team {player % 2}</p>
        </div>
        {isActive ? <span className="rounded bg-brass px-2 py-1 text-xs font-semibold text-[#201602]">Active</span> : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {state.hands[player].map((card) => {
          const enabled = legal.mustDiscard || playable.has(cardId(card));
          return (
            <button
              key={cardId(card)}
              className="h-16 rounded border border-white/15 bg-white px-2 text-lg font-bold text-[#071411] shadow-sm disabled:bg-white/30"
              disabled={disabled || !enabled}
              onClick={() => onCard(card)}
            >
              {cardLabel(card)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed");
  }

  return payload as T;
}

function TrickTable({ state }: { state: GameState }) {
  return (
    <section className="rounded border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Current trick</h2>
      <div className="mt-3 grid min-h-20 gap-2 sm:grid-cols-4">
        {state.currentTrick?.plays.length
          ? state.currentTrick.plays.map((play) => (
              <div key={`${play.player}-${cardId(play.card)}`} className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs text-white/45">{PLAYER_NAMES[play.player]}</p>
                <p className="text-lg font-semibold">{cardLabel(play.card)}</p>
              </div>
            ))
          : <p className="text-sm text-white/50">No cards in the current trick.</p>}
      </div>

      <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Completed tricks</h2>
      <div className="mt-3 space-y-2">
        {state.completedTricks.map((trick, index) => (
          <div key={index} className="rounded border border-white/10 px-3 py-2 text-sm text-white/70">
            Trick {index + 1}: {trick.plays.map((play) => `${PLAYER_NAMES[play.player]} ${cardLabel(play.card)}`).join(", ")}
            {trick.winner !== undefined ? ` | Winner: ${PLAYER_NAMES[trick.winner]}` : ""}
          </div>
        ))}
      </div>
    </section>
  );
}

function MoveHistory({ moves }: { moves: MoveEvent[] }) {
  return (
    <section className="rounded border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Move log</h2>
      <ol className="mt-3 max-h-[520px] space-y-2 overflow-auto text-sm">
        {moves.length ? moves.map((move) => (
          <li key={move.id} className="rounded border border-white/10 px-3 py-2 text-white/70">
            <span className="text-white/40">#{move.sequence}</span> {describeMove(move)}
          </li>
        )) : <li className="text-white/45">No moves recorded yet.</li>}
      </ol>
    </section>
  );
}

function describeMove(move: MoveEvent): string {
  const action = move.action;
  switch (action.type) {
    case "START_HAND":
      return `Started hand with seed ${action.seed}`;
    case "NEXT_HAND":
      return `Next hand with seed ${action.seed}`;
    case "PASS":
      return `${PLAYER_NAMES[action.player]} passed`;
    case "ORDER_UP":
      return `${PLAYER_NAMES[action.player]} ordered up${action.alone ? " alone" : ""}`;
    case "CALL_TRUMP":
      return `${PLAYER_NAMES[action.player]} called ${action.suit}${action.alone ? " alone" : ""}`;
    case "DISCARD":
      return `${PLAYER_NAMES[action.player]} discarded ${cardLabel(action.card)}`;
    case "PLAY_CARD":
      return `${PLAYER_NAMES[action.player]} played ${cardLabel(action.card)}`;
    case "RESET_GAME":
      return "Reset game";
    default:
      return "Unknown move";
  }
}
