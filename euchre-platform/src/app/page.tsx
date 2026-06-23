"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cardId,
  cardLabel,
  BOT_DIFFICULTIES,
  DEALER_SELECTIONS,
  FARMERS_HAND_MODES,
  LONER_MODES,
  TARGET_SCORES,
  buildRuleSummary,
  chooseBotAction,
  createDefaultBotProfiles,
  createInitialGameState,
  formatBotDifficulty,
  formatDealerSelection,
  formatFarmersHandMode,
  formatLonerMode,
  legalActionsForPlayer,
  parsePracticeSeed,
  replacementSelectionLabel,
  selectedFarmersHandReplacementCards,
  toggleFarmersHandReplacementSelection,
  type BotDifficulty,
  type Card,
  type DealerSelection,
  type FarmersHandMode,
  type GameAction,
  type GameState,
  type LonerMode,
  type MoveEvent,
  type PlayerIndex,
  type RuleSummary,
  type TargetScore
} from "@/lib/euchre";
import type { LoadedGame } from "@/lib/persistence/event-store";
import type { GameReviewSummary, HandReview, SeatReviewStats, TrickReview } from "@/lib/review/game-review";
import {
  createInitialReplaySelection,
  formatReplayHandLabel,
  formatReplayTrickLabel,
  getSelectedReplay,
  nextReplayHand,
  nextReplayTrick,
  previousReplayHand,
  previousReplayTrick,
  resetReplaySelection,
  selectReplayHand,
  selectReplayTrick,
  type ReplaySelection
} from "@/lib/review/replay-viewer";
import {
  chooseActiveReviewSource,
  clearHistoricalReviewState,
  profileHistoryGameId,
  type ActiveReviewSource,
  type HistoricalReviewState
} from "@/lib/review/review-drilldown";
import type { ProfileAggregateSummary } from "@/lib/profiles/profile-aggregates";
import type { PlayerProfileDetail, ProfileGameHistoryRow, ProfileTrendStats, TrendRecord } from "@/lib/profiles/profile-detail";

const STORAGE_KEY = "euchre-platform-active-game-id";
const PLAYER_NAMES: Record<PlayerIndex, string> = {
  0: "South",
  1: "West",
  2: "North",
  3: "East"
};

export default function Home() {
  const [stickDealer, setStickDealer] = useState(false);
  const [targetScore, setTargetScore] = useState<TargetScore>(10);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("standard");
  const [dealerSelection, setDealerSelection] = useState<DealerSelection>("default");
  const [farmersHandMode, setFarmersHandMode] = useState<FarmersHandMode>("off");
  const [lonerMode, setLonerMode] = useState<LonerMode>("aloneOnly");
  const [seedInput, setSeedInput] = useState("");
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [state, setState] = useState<GameState>(() => createInitialGameState({
    stickDealer,
    targetScore,
    botDifficulty,
    dealerSelection,
    farmersHandMode,
    lonerMode
  }));
  const [alone, setAlone] = useState(false);
  const [persistedGameId, setPersistedGameId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Local state ready");
  const [review, setReview] = useState<GameReviewSummary | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileAggregateSummary | null>(null);
  const [selectedProfileSeat, setSelectedProfileSeat] = useState<PlayerIndex>(0);
  const [profileDetail, setProfileDetail] = useState<PlayerProfileDetail | null>(null);
  const [historicalReview, setHistoricalReview] = useState<HistoricalReviewState | null>(null);
  const [loadingHistoricalReviewId, setLoadingHistoricalReviewId] = useState<string | null>(null);
  const [historicalReviewStatus, setHistoricalReviewStatus] = useState<string | null>(null);
  const bots = useMemo(() => createDefaultBotProfiles(), []);
  const lastBotActionKey = useRef<string | null>(null);
  const activeReviewSource = chooseActiveReviewSource({ currentReview: review, historicalReview });

  const loadProfileStats = useCallback(async () => {
    try {
      const result = await fetchJson<{ profiles: ProfileAggregateSummary }>("/api/profiles");
      setProfileStats(result.profiles);
    } catch {
      setProfileStats(null);
    }
  }, []);

  const loadProfileDetail = useCallback(async (seat: PlayerIndex) => {
    try {
      const result = await fetchJson<{ profile: PlayerProfileDetail }>(`/api/profiles/${seat}`);
      setProfileDetail(result.profile);
    } catch {
      setProfileDetail(null);
    }
  }, []);

  useEffect(() => {
    void loadProfileStats();

    const savedGameId = window.localStorage.getItem(STORAGE_KEY);
    if (!savedGameId) {
      return;
    }

    void loadPersistedGame(savedGameId);
  }, [loadProfileStats]);

  useEffect(() => {
    void loadProfileDetail(selectedProfileSeat);
  }, [loadProfileDetail, selectedProfileSeat]);

  async function loadPersistedGame(gameId: string) {
    setIsSaving(true);
    setStatus("Loading saved game events...");
    try {
      const loaded = await fetchJson<LoadedGame>(`/api/games/${gameId}`);
      setPersistedGameId(loaded.game.id);
      setStickDealer(loaded.game.config.stickDealer);
      setTargetScore(asTargetScore(loaded.game.config.targetScore));
      setBotDifficulty(loaded.game.config.botDifficulty ?? "standard");
      setDealerSelection(loaded.game.config.dealerSelection ?? "default");
      setFarmersHandMode(loaded.game.config.farmersHandMode ?? "off");
      setLonerMode(loaded.game.config.lonerMode ?? "aloneOnly");
      setState(loaded.state);
      setReview(null);
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

  const act = useCallback(async (action: GameAction, actorLabel = "Human") => {
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
      setStatus(`${actorLabel} persisted event #${result.state.moveLog.length - 1}`);
      setAlone(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Move could not be persisted");
    } finally {
      setIsSaving(false);
    }
  }, [persistedGameId, state.moveLog.length]);

  useEffect(() => {
    if (!persistedGameId || state.phase !== "gameComplete") {
      setReview(null);
      return;
    }

    let cancelled = false;
    void fetchJson<{ review: GameReviewSummary }>(`/api/games/${persistedGameId}/review`)
      .then((result) => {
        if (!cancelled) {
          setReview(result.review);
          void loadProfileStats();
          void loadProfileDetail(selectedProfileSeat);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Unable to load game review");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadProfileDetail, loadProfileStats, persistedGameId, selectedProfileSeat, state.phase, state.moveLog.length]);

  useEffect(() => {
    if (!persistedGameId || isSaving) {
      return;
    }

    const activeBot = bots.find((bot) => bot.enabled && bot.seat === state.activePlayer);
    if (!activeBot) {
      return;
    }

    const action = chooseBotAction(state, activeBot);
    if (!action) {
      return;
    }

    const actionKey = `${persistedGameId}:${state.moveLog.length}:${state.phase}:${state.activePlayer}`;
    if (lastBotActionKey.current === actionKey) {
      return;
    }
    lastBotActionKey.current = actionKey;

    const timeout = window.setTimeout(() => {
      void act(action, activeBot.name);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [act, bots, isSaving, persistedGameId, state]);

  async function startNewGame() {
    setIsSaving(true);
    setStatus("Creating persisted game...");
    try {
      const { seed } = parsePracticeSeed(seedInput);
      setLastSeed(seed);
      const created = await fetchJson<{ game: LoadedGame["game"] }>("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { stickDealer, targetScore, botDifficulty, dealerSelection, farmersHandMode, lonerMode },
          metadata: { source: "local-phase-1-ui" }
        })
      });
      setPersistedGameId(created.game.id);
      lastBotActionKey.current = null;
      setReview(null);
      window.localStorage.setItem(STORAGE_KEY, created.game.id);

      const started = await fetchJson<Pick<LoadedGame, "state">>(`/api/games/${created.game.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedSequence: 0,
          action: { type: "START_HAND", seed }
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
    const next = createInitialGameState({ stickDealer, targetScore, botDifficulty, dealerSelection, farmersHandMode, lonerMode });
    setState(next);
    setPersistedGameId(null);
    lastBotActionKey.current = null;
    setReview(null);
    setAlone(false);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("Local state reset; persisted events were left immutable");
  }

  function updateBotDifficulty(nextDifficulty: BotDifficulty) {
    setBotDifficulty(nextDifficulty);
    if (state.phase === "idle") {
      setState(createInitialGameState({
        stickDealer,
        targetScore,
        botDifficulty: nextDifficulty,
        dealerSelection,
        farmersHandMode,
        lonerMode
      }));
    }
  }

  async function openHistoricalReview(gameId: string) {
    const selectedGameId = profileHistoryGameId(gameId);
    setLoadingHistoricalReviewId(selectedGameId);
    setHistoricalReviewStatus(`Loading review ${selectedGameId}...`);
    try {
      const result = await fetchJson<{ review: GameReviewSummary }>(`/api/games/${selectedGameId}/review`);
      setHistoricalReview({
        gameId: selectedGameId,
        review: result.review
      });
      setHistoricalReviewStatus(`Loaded historical review ${selectedGameId}`);
    } catch (error) {
      setHistoricalReviewStatus(error instanceof Error ? error.message : "Unable to load historical review");
    } finally {
      setLoadingHistoricalReviewId(null);
    }
  }

  function clearHistoricalReview() {
    setHistoricalReview(clearHistoricalReviewState());
    setHistoricalReviewStatus(review ? "Returned to current game review" : "Cleared historical review");
  }

  function copySeed() {
    const seed = lastSeed ?? parsePracticeSeed(seedInput).seed;
    setLastSeed(seed);
    setSeedInput(String(seed));
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(String(seed));
    }
    setStatus(`Seed ${seed} ready to reuse`);
  }

  return (
    <main className="min-h-screen bg-[#071411]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Phase 1 foundation</p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Euchre Platform</h1>
            <p className="mt-1 text-sm text-white/55">You are South. West, North, and East are deterministic bots.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Target
              <select
                className="rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={targetScore}
                disabled={state.phase !== "idle"}
                onChange={(event) => setTargetScore(Number(event.target.value) as TargetScore)}
              >
                {TARGET_SCORES.map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Bot difficulty
              <select
                className="rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={botDifficulty}
                disabled={state.phase !== "idle"}
                onChange={(event) => updateBotDifficulty(event.target.value as BotDifficulty)}
              >
                {BOT_DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {formatBotDifficulty(difficulty)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Dealer
              <select
                className="rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={dealerSelection}
                disabled={state.phase !== "idle"}
                onChange={(event) => setDealerSelection(event.target.value as DealerSelection)}
              >
                {DEALER_SELECTIONS.map((selection) => (
                  <option key={selection} value={selection}>
                    {formatDealerSelection(selection)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <input
                type="checkbox"
                checked={stickDealer}
                disabled={state.phase !== "idle"}
                onChange={(event) => setStickDealer(event.target.checked)}
              />
              Stick dealer
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Farmer
              <select
                className="rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={farmersHandMode}
                disabled={state.phase !== "idle"}
                onChange={(event) => setFarmersHandMode(event.target.value as FarmersHandMode)}
              >
                {FARMERS_HAND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {formatFarmersHandMode(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Loner
              <select
                className="rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={lonerMode}
                disabled={state.phase !== "idle"}
                onChange={(event) => setLonerMode(event.target.value as LonerMode)}
              >
                {LONER_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {formatLonerMode(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              Seed
              <input
                className="w-28 rounded border border-white/15 bg-[#071411] px-2 py-1 text-white"
                value={seedInput}
                disabled={state.phase !== "idle"}
                inputMode="numeric"
                placeholder={lastSeed === null ? "auto" : String(lastSeed)}
                onChange={(event) => setSeedInput(event.target.value)}
              />
            </label>
            <button
              className="rounded border border-white/20 px-3 py-2 text-sm font-semibold text-white"
              onClick={copySeed}
              type="button"
            >
              Copy seed
            </button>
            <button
              className="rounded bg-brass px-4 py-2 text-sm font-semibold text-[#201602]"
              disabled={isSaving}
              onClick={state.phase === "idle" ? startNewGame : resetGame}
            >
              {state.phase === "idle" ? "Start hand" : "Reset"}
            </button>
          </div>
        </header>

        <SetupHelp
          farmersHandMode={farmersHandMode}
          lonerMode={lonerMode}
          lastSeed={lastSeed}
        />

        <section className="rounded border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          <span className="font-semibold text-white">Persistence:</span>{" "}
          {persistedGameId ? `Game ${persistedGameId}` : "No persisted game selected"} | {status}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-4">
            <GameSummary state={state} />
            {activeReviewSource ? (
              <GameReviewPanel
                source={activeReviewSource}
                canReturnToCurrent={activeReviewSource.kind === "historical" && Boolean(review)}
                onClearHistoricalReview={activeReviewSource.kind === "historical" ? clearHistoricalReview : undefined}
              />
            ) : null}
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Bots</h2>
                <span className="text-xs font-semibold text-brass">{formatBotDifficulty(state.config.botDifficulty)}</span>
              </div>
              <div className="mt-3 space-y-2">
                {bots.map((bot) => (
                  <div key={bot.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm">
                    <span>{bot.name}</span>
                    <span className="text-white/45">Seat {bot.seat}</span>
                  </div>
                ))}
              </div>
            </section>

            <ProfileStatsPanel
              profiles={profileStats}
              selectedSeat={selectedProfileSeat}
              detail={profileDetail}
              loadingReviewGameId={loadingHistoricalReviewId}
              reviewStatus={historicalReviewStatus}
              onSelectSeat={setSelectedProfileSeat}
              onOpenReview={openHistoricalReview}
            />

            <MoveHistory moves={state.moveLog} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function GameSummary({ state }: { state: GameState }) {
  const winner = gameWinner(state);
  const ruleSummary = buildRuleSummary(state.config, {
    events: moveLogRuleEvents(state.moveLog),
    initialDealer: state.handNumber <= 1 ? state.dealer : undefined
  });

  return (
    <section className="grid gap-3 rounded border border-white/10 bg-table p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="Hand" value={state.handNumber ? String(state.handNumber) : "Not dealt"} />
      <SummaryItem label="Score" value={`Team 0 ${state.scores[0]} - ${state.scores[1]} Team 1`} />
      <SummaryItem label="Target" value={String(state.config.targetScore)} />
      <SummaryItem label="Phase" value={state.phase} />
      <SummaryItem label="Dealer" value={PLAYER_NAMES[state.dealer]} />
      <SummaryItem label="Bot difficulty" value={formatBotDifficulty(state.config.botDifficulty)} />
      <SummaryItem label="Farmer" value={formatFarmersHandMode(state.config.farmersHandMode)} />
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
      {winner !== null ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="rounded border border-brass/40 bg-brass/10 px-3 py-2 text-sm text-brass">
            Game winner: Team {winner}
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
      <div className="sm:col-span-2 lg:col-span-4">
        <RuleSummaryPanel summary={ruleSummary} tone="dark" />
      </div>
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

function SetupHelp({
  farmersHandMode,
  lonerMode,
  lastSeed
}: {
  farmersHandMode: FarmersHandMode;
  lonerMode: LonerMode;
  lastSeed: number | null;
}) {
  return (
    <section className="grid gap-3 rounded border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/65 lg:grid-cols-3">
      <div>
        <p className="font-semibold text-white">Farmer&apos;s Hand</p>
        <p className="mt-1">{farmersHandHelp(farmersHandMode)}</p>
        <p className="mt-1 text-xs text-white/45">Qualifier: only 9s and 10s; no A, K, Q, or J.</p>
      </div>
      <div>
        <p className="font-semibold text-white">Loner mode</p>
        <p className="mt-1">
          {lonerMode === "aloneOnly"
            ? "Standard loners are fully supported: the caller may go alone under current scoring."
            : "Assisted-loner mode is stored for replay safety, but assisted gameplay remains deferred."}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white">Seed practice</p>
        <p className="mt-1">
          Enter a seed before starting to repeat the first deal, or copy the active seed after creation.
          {lastSeed === null ? "" : ` Current seed: ${lastSeed}.`}
        </p>
      </div>
    </section>
  );
}

function farmersHandHelp(mode: FarmersHandMode): string {
  switch (mode) {
    case "redeal":
      return "A qualifying player may claim a deterministic redeal before bidding.";
    case "replaceThree":
      return "A qualifying human may choose 1-3 low cards to exchange with the kitty.";
    case "off":
    default:
      return "No Farmer's Hand phase; bidding begins immediately after the deal.";
  }
}

function RuleSummaryPanel({ summary, tone = "dark" }: { summary: RuleSummary; tone?: "dark" | "brass" }) {
  const borderClass = tone === "brass" ? "border-brass/30 bg-[#071411]/35" : "border-white/10 bg-white/[0.04]";

  return (
    <section className={`rounded border ${borderClass} px-3 py-2`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Rules</p>
        {summary.defaultsApplied ? <p className="text-xs text-white/40">Normalized defaults applied where needed</p> : null}
      </div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {summary.items.map((item) => (
          <div key={item.label} className="rounded border border-white/10 px-2 py-2">
            <p className="uppercase tracking-[0.12em] text-white/35">{item.label}</p>
            <p className="mt-1 font-semibold text-white">{item.value}</p>
            {item.detail ? <p className="mt-1 text-white/45">{item.detail}</p> : null}
          </div>
        ))}
      </div>
      {summary.warnings.length ? (
        <div className="mt-2 space-y-1">
          {summary.warnings.map((warning) => (
            <p key={warning} className="rounded border border-brass/35 bg-brass/10 px-2 py-1 text-xs text-brass">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function asTargetScore(score: number): TargetScore {
  return TARGET_SCORES.includes(score as TargetScore) ? score as TargetScore : 10;
}

function moveLogRuleEvents(moves: MoveEvent[]) {
  return moves.map((move) => ({
    eventType: move.action.type,
    payload: move.action
  }));
}

function GameReviewPanel({
  source,
  canReturnToCurrent,
  onClearHistoricalReview
}: {
  source: ActiveReviewSource;
  canReturnToCurrent: boolean;
  onClearHistoricalReview?: () => void;
}) {
  const review = source.review;
  const [replaySelection, setReplaySelection] = useState<ReplaySelection>(() => createInitialReplaySelection(review));

  useEffect(() => {
    setReplaySelection(createInitialReplaySelection(review));
  }, [review]);

  return (
    <section className="rounded border border-brass/35 bg-brass/10 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-brass">Game review</h2>
          <p className="mt-1 text-lg font-semibold text-white">
            Team {review.winningTeam} wins {review.finalScore[0]} - {review.finalScore[1]}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-sm text-white/60">{review.totalHandsPlayed} hands | {review.totalEvents} events</p>
          <p className="break-all text-xs text-white/45">{source.label}</p>
          {source.kind === "historical" ? (
            <button
              className="rounded border border-white/20 px-3 py-2 text-xs font-semibold text-white"
              onClick={onClearHistoricalReview}
            >
              {canReturnToCurrent ? "Return to current review" : "Clear historical review"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReviewMetric label="Euchres" value={review.totalEuchres} />
        <ReviewMetric label="Maker wins" value={review.totalSuccessfulMakerHands} />
        <ReviewMetric label="Maker fails" value={review.totalFailedMakerHands} />
        <ReviewMetric label="Lone attempts" value={review.totalLoneAttempts} />
      </div>

      <div className="mt-4">
        <RuleSummaryPanel summary={review.ruleSummary} tone="brass" />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-white/45">
            <tr>
              <th className="border-b border-white/10 py-2 pr-3">Seat</th>
              <th className="border-b border-white/10 px-3 py-2">Team</th>
              <th className="border-b border-white/10 px-3 py-2">Deals</th>
              <th className="border-b border-white/10 px-3 py-2">Calls</th>
              <th className="border-b border-white/10 px-3 py-2">Call W-L</th>
              <th className="border-b border-white/10 px-3 py-2">Tricks</th>
              <th className="border-b border-white/10 px-3 py-2">Cards</th>
              <th className="border-b border-white/10 pl-3 py-2">Loners</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {review.seats.map((seat) => (
              <ReviewSeatRow key={seat.seat} seat={seat} />
            ))}
          </tbody>
        </table>
      </div>

      <HandReplayViewer review={review} selection={replaySelection} onSelectionChange={setReplaySelection} />

      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Hand by hand</h3>
        {review.hands.map((hand) => (
          <HandReviewCard key={hand.handNumber} hand={hand} />
        ))}
      </div>
    </section>
  );
}

function ProfileStatsPanel({
  profiles,
  selectedSeat,
  detail,
  loadingReviewGameId,
  reviewStatus,
  onSelectSeat,
  onOpenReview
}: {
  profiles: ProfileAggregateSummary | null;
  selectedSeat: PlayerIndex;
  detail: PlayerProfileDetail | null;
  loadingReviewGameId: string | null;
  reviewStatus: string | null;
  onSelectSeat: (seat: PlayerIndex) => void;
  onOpenReview: (gameId: string) => void | Promise<void>;
}) {
  return (
    <section className="rounded border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Local profiles</h2>
          <p className="mt-1 text-xs text-white/45">
            {profiles ? `${profiles.completedGames} completed game${profiles.completedGames === 1 ? "" : "s"}` : "Loading stats"}
          </p>
        </div>
      </div>

      {profiles && profiles.completedGames > 0 ? (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead className="uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="border-b border-white/10 py-2 pr-2">Player</th>
                  <th className="border-b border-white/10 px-2 py-2">W-L</th>
                  <th className="border-b border-white/10 px-2 py-2">Win %</th>
                  <th className="border-b border-white/10 px-2 py-2">Calls</th>
                  <th className="border-b border-white/10 px-2 py-2">Call %</th>
                  <th className="border-b border-white/10 pl-2 py-2">Tricks</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {profiles.players.map((player) => (
                  <tr key={player.profileId} className={selectedSeat === player.seat ? "bg-brass/10" : undefined}>
                    <td className="border-b border-white/10 py-2 pr-2 font-semibold text-white">
                      <button
                        className="text-left underline decoration-white/20 underline-offset-4 hover:text-brass"
                        onClick={() => onSelectSeat(player.seat)}
                      >
                        {player.name}
                      </button>
                    </td>
                    <td className="border-b border-white/10 px-2 py-2">{player.wins}-{player.losses}</td>
                    <td className="border-b border-white/10 px-2 py-2">{formatRate(player.winPercentage)}</td>
                    <td className="border-b border-white/10 px-2 py-2">{player.successfulCalls}-{player.failedCalls}</td>
                    <td className="border-b border-white/10 px-2 py-2">{formatRate(player.callSuccessPercentage)}</td>
                    <td className="border-b border-white/10 py-2 pl-2">{player.tricksWon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-1">
            {profiles.teams.map((team) => (
              <div key={team.team} className="rounded border border-white/10 px-3 py-2 text-white/70">
                <p className="font-semibold text-white">{team.label}: {team.wins}-{team.losses}</p>
                <p className="mt-1 text-white/45">
                  Avg {team.averagePointsPerGame} pts | Maker {formatRate(team.makerSuccessPercentage)} | Euchres {team.euchresEarned} earned / {team.euchresSuffered} suffered
                </p>
              </div>
            ))}
          </div>

          <ProfileDetailPanel
            detail={detail}
            loadingReviewGameId={loadingReviewGameId}
            reviewStatus={reviewStatus}
            onOpenReview={onOpenReview}
          />
        </>
      ) : (
        <p className="mt-3 text-sm text-white/45">Complete a persisted game to populate local profile stats.</p>
      )}
    </section>
  );
}

function ProfileDetailPanel({
  detail,
  loadingReviewGameId,
  reviewStatus,
  onOpenReview
}: {
  detail: PlayerProfileDetail | null;
  loadingReviewGameId: string | null;
  reviewStatus: string | null;
  onOpenReview: (gameId: string) => void | Promise<void>;
}) {
  if (!detail) {
    return <p className="mt-3 text-sm text-white/45">Select a profile to load detail.</p>;
  }

  return (
    <div className="mt-4 rounded border border-white/10 bg-[#071411]/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{detail.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">{detail.teamLabel}</p>
        </div>
        <span className="rounded border border-brass/35 px-2 py-1 text-xs text-brass">
          {detail.career.wins}-{detail.career.losses}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <ProfileMiniMetric label="Win %" value={formatRate(detail.career.winPercentage)} />
        <ProfileMiniMetric label="Points" value={`${detail.career.pointsScored}-${detail.career.pointsAllowed}`} />
        <ProfileMiniMetric label="Avg pts" value={`${detail.career.averagePointsScoredPerGame}/${detail.career.averagePointsAllowedPerGame}`} />
        <ProfileMiniMetric label="Tricks" value={`${detail.career.tricksWon} (${detail.career.averageTricksPerGame}/g)`} />
        <ProfileMiniMetric label="Calls" value={`${detail.career.successfulCalls}-${detail.career.failedCalls}`} />
        <ProfileMiniMetric label="Call %" value={formatRate(detail.career.callSuccessPercentage)} />
        <ProfileMiniMetric label="Dealer" value={String(detail.career.timesDealer)} />
        <ProfileMiniMetric label="Cards" value={String(detail.career.cardsPlayed)} />
        <ProfileMiniMetric label="Loners" value={`${detail.career.successfulLoners}/${detail.career.loneAttempts}`} />
        <ProfileMiniMetric
          label="Lone %"
          value={detail.career.loneSuccessPercentage === null ? "N/A" : formatRate(detail.career.loneSuccessPercentage)}
        />
      </div>

      <div className="mt-3 rounded border border-white/10 px-3 py-2 text-xs text-white/65">
        <p className="font-semibold text-white">Trends</p>
        <p className="mt-1">Last 5: {recordLabel(detail.trends.last5GamesRecord)} | Last 10: {recordLabel(detail.trends.last10GamesRecord)}</p>
        <p className="mt-1">
          Recent: {formatRate(detail.trends.recentWinPercentage)} wins, {formatRate(detail.trends.recentCallSuccessPercentage)} calls, {detail.trends.recentAverageTricksPerGame} tricks/game
        </p>
        <p className="mt-1">
          Streak: {streakLabel(detail.trends.currentStreak)} | Best W {detail.trends.bestWinStreak} | Worst L {detail.trends.worstLosingStreak}
        </p>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Game history</p>
          {reviewStatus ? <span className="text-xs text-white/45">{reviewStatus}</span> : null}
        </div>
        <div className="mt-2 max-h-72 space-y-2 overflow-auto">
          {detail.gameHistory.length ? detail.gameHistory.map((game) => (
            <ProfileGameHistoryCard
              key={game.gameId}
              game={game}
              isLoading={loadingReviewGameId === game.gameId}
              onOpenReview={onOpenReview}
            />
          )) : <p className="text-sm text-white/45">No completed games for this profile yet.</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileGameHistoryCard({
  game,
  isLoading,
  onOpenReview
}: {
  game: ProfileGameHistoryRow;
  isLoading: boolean;
  onOpenReview: (gameId: string) => void | Promise<void>;
}) {
  return (
    <div className="rounded border border-white/10 px-3 py-2 text-xs text-white/65">
      <div className="flex items-center justify-between gap-2">
        <span className={game.result === "win" ? "font-semibold text-brass" : "font-semibold text-white"}>
          {game.result.toUpperCase()} {game.pointsScored}-{game.pointsAllowed}
        </span>
        <span className="text-white/40">Hands {game.handsPlayed}</span>
      </div>
      <p className="mt-1 break-all text-white/40">{game.gameId}</p>
      <p className="mt-1">
        Calls {game.successfulCalls}-{game.failedCalls} | Tricks {game.tricksWon} | Loners {game.successfulLoners}/{game.loneAttempts}
      </p>
      <p className="mt-1 text-white/40">
        Target {game.ruleSummary.targetScoreLabel} | {game.ruleSummary.botDifficultyLabel} | Farmer {game.ruleSummary.farmersHandModeLabel} | Seed {game.ruleSummary.seedLabel}
      </p>
      <button
        className="mt-2 rounded border border-brass/40 px-3 py-2 text-xs font-semibold text-brass disabled:opacity-60"
        disabled={isLoading}
        onClick={() => onOpenReview(game.gameId)}
      >
        {isLoading ? "Loading review..." : "Review Game"}
      </button>
    </div>
  );
}

function ProfileMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function HandReplayViewer({
  review,
  selection,
  onSelectionChange
}: {
  review: GameReviewSummary;
  selection: ReplaySelection;
  onSelectionChange: (selection: ReplaySelection) => void;
}) {
  const selected = getSelectedReplay(review, selection);
  const hand = selected.hand;
  const trick = selected.trick;
  const winningPlay = selected.winningPlay;

  return (
    <section className="mt-5 rounded border border-white/10 bg-[#071411]/45 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">Hand replay</h3>
          <p className="mt-1 text-base font-semibold text-white">
            {formatReplayHandLabel(hand)} | {formatReplayTrickLabel(trick)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded border border-white/15 bg-[#071411] px-3 py-2 text-sm text-white"
            value={selected.selection.handIndex}
            onChange={(event) => onSelectionChange(selectReplayHand(review, Number(event.target.value)))}
          >
            {review.hands.map((reviewHand, index) => (
              <option key={reviewHand.handNumber} value={index}>
                Hand {reviewHand.handNumber}
              </option>
            ))}
          </select>
          <button className="rounded border border-white/20 px-3 py-2 text-sm text-white" onClick={() => onSelectionChange(previousReplayHand(review, selected.selection))}>
            Previous hand
          </button>
          <button className="rounded border border-white/20 px-3 py-2 text-sm text-white" onClick={() => onSelectionChange(nextReplayHand(review, selected.selection))}>
            Next hand
          </button>
          <button className="rounded bg-white px-3 py-2 text-sm font-semibold text-[#071411]" onClick={() => onSelectionChange(resetReplaySelection(review))}>
            Reset
          </button>
        </div>
      </div>

      {hand ? (
        <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
          <ReviewDetail label="Dealer" value={PLAYER_NAMES[hand.dealer]} />
          <ReviewDetail label="Upcard" value={hand.upcard ? cardLabel(hand.upcard) : "None"} />
          <ReviewDetail label="Trump" value={hand.trumpSuit ?? "None"} />
          <ReviewDetail label="Caller" value={hand.maker !== undefined ? PLAYER_NAMES[hand.maker] : "None"} />
          <ReviewDetail label="Maker team" value={hand.makerTeam !== undefined ? `Team ${hand.makerTeam}` : "None"} />
          <ReviewDetail label="Defending team" value={hand.defendingTeam !== undefined ? `Team ${hand.defendingTeam}` : "None"} />
          <ReviewDetail label="Alone" value={hand.aloneDeclared ? "Yes" : "No"} />
          <ReviewDetail label="Result" value={formatScoringResult(hand)} />
          <ReviewDetail label="Points" value={`${hand.pointsAwarded[0]} - ${hand.pointsAwarded[1]}`} />
          <ReviewDetail label="Score after" value={`${hand.teamScoreAfterHand[0]} - ${hand.teamScoreAfterHand[1]}`} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/60">No completed hands are available to replay.</p>
      )}

      {hand ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="rounded border border-white/20 px-3 py-2 text-sm text-white" onClick={() => onSelectionChange(previousReplayTrick(review, selected.selection))}>
            Previous trick
          </button>
          {hand.tricks.map((handTrick, index) => (
            <button
              key={handTrick.trickNumber}
              className={`rounded border px-3 py-2 text-sm ${
                selected.selection.trickIndex === index
                  ? "border-brass bg-brass text-[#201602]"
                  : "border-white/20 text-white"
              }`}
              onClick={() => onSelectionChange(selectReplayTrick(review, selected.selection, index))}
            >
              Trick {handTrick.trickNumber}
            </button>
          ))}
          <button className="rounded border border-white/20 px-3 py-2 text-sm text-white" onClick={() => onSelectionChange(nextReplayTrick(review, selected.selection))}>
            Next trick
          </button>
        </div>
      ) : null}

      {trick ? (
        <div className="mt-4 rounded border border-white/10 bg-[#071411]/50 p-3 text-sm">
          <div className="grid gap-3 text-white/70 sm:grid-cols-2 lg:grid-cols-4">
            <HighlightedReviewDetail label="Leader" value={PLAYER_NAMES[trick.leader]} />
            <HighlightedReviewDetail label="Led suit" value={trick.ledSuit} />
            <HighlightedReviewDetail label="Trump suit" value={trick.trumpSuit ?? "None"} />
            <HighlightedReviewDetail label="Winning seat" value={PLAYER_NAMES[trick.winningSeat]} />
            <HighlightedReviewDetail label="Winning card" value={winningPlay ? cardLabel(winningPlay.card) : "Unknown"} />
            <ReviewDetail label="Winning team" value={`Team ${trick.winningTeam}`} />
            <ReviewDetail label="Trump played" value={trick.trumpPlayed ? "Yes" : "No"} />
            <ReviewDetail label="Winner used trump" value={trick.winnerUsedTrump ? "Yes" : "No"} />
            <ReviewDetail label="Caller relation" value={trick.winnerRelationToCaller} />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {trick.cardsPlayed.map((play) => {
              const isLeader = play.player === trick.leader;
              const isWinner = play.player === trick.winningSeat && winningPlay && cardId(play.card) === cardId(winningPlay.card);

              return (
                <div
                  key={`${play.sequenceNumber}-${play.order}`}
                  className={`rounded border px-3 py-2 ${
                    isWinner
                      ? "border-brass bg-brass/15 text-white"
                      : isLeader
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 text-white/70"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/45">Play {play.order}</p>
                  <p className="mt-1 font-semibold">
                    {PLAYER_NAMES[play.player]} {cardLabel(play.card)}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {isLeader ? "Leader" : "Follower"} | {play.effectiveSuit}
                    {play.playedTrump ? " | trump" : ""}
                    {isWinner ? " | winning card" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/10 bg-[#071411]/40 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ReviewSeatRow({ seat }: { seat: SeatReviewStats }) {
  return (
    <tr>
      <td className="border-b border-white/10 py-2 pr-3 font-semibold text-white">{PLAYER_NAMES[seat.seat]}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.team}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.handsDealt}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.timesCaller}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.successfulCalls}-{seat.failedCalls}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.tricksWon}</td>
      <td className="border-b border-white/10 px-3 py-2">{seat.cardsPlayed}</td>
      <td className="border-b border-white/10 py-2 pl-3">{seat.successfulLoners}/{seat.loneAttempts}</td>
    </tr>
  );
}

function HandReviewCard({ hand }: { hand: HandReview }) {
  return (
    <details className="rounded border border-white/10 bg-[#071411]/35 px-3 py-2 text-sm" open={hand.handNumber === 1}>
      <summary className="cursor-pointer text-white">
        Hand {hand.handNumber}: dealer {PLAYER_NAMES[hand.dealer]}, caller {hand.maker !== undefined ? PLAYER_NAMES[hand.maker] : "None"}, trump {hand.trumpSuit ?? "None"} | {formatScoringResult(hand)}
      </summary>
      <div className="mt-3 grid gap-2 text-white/70 sm:grid-cols-2 lg:grid-cols-4">
        <ReviewDetail label="Score after" value={`${hand.teamScoreAfterHand[0]} - ${hand.teamScoreAfterHand[1]}`} />
        <ReviewDetail label="Upcard" value={hand.upcard ? cardLabel(hand.upcard) : "None"} />
        <ReviewDetail label="Maker tricks" value={String(hand.makerTricks)} />
        <ReviewDetail label="Defender tricks" value={String(hand.defenderTricks)} />
      </div>
      {hand.dealerPickup ? (
        <p className="mt-2 text-white/60">
          Dealer picked up {cardLabel(hand.dealerPickup.upcard)}
          {hand.dealerDiscard ? ` and discarded ${cardLabel(hand.dealerDiscard.card)}` : ""}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {hand.tricks.map((trick) => (
          <TrickReviewLine key={trick.trickNumber} trick={trick} />
        ))}
      </div>
    </details>
  );
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

function HighlightedReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-brass/35 bg-brass/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.12em] text-brass">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

function TrickReviewLine({ trick }: { trick: TrickReview }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2 text-white/65">
      <p>
        Trick {trick.trickNumber}: {trick.cardsPlayed.map((play) => `${PLAYER_NAMES[play.player]} ${cardLabel(play.card)}`).join(", ")}
      </p>
      <p className="mt-1 text-xs text-white/45">
        Led {trick.ledSuit}; winner {PLAYER_NAMES[trick.winningSeat]} ({trick.winnerRelationToCaller})
        {trick.trumpPlayed ? "; trump played" : ""}
      </p>
    </div>
  );
}

function formatScoringResult(hand: HandReview): string {
  if (hand.passed) {
    return "passed out";
  }

  if (hand.defendersEuchredMakers) {
    return `euchre, Team ${hand.defendingTeam} +${hand.pointsAwarded[hand.defendingTeam ?? 0]}`;
  }

  return `makers scored, Team ${hand.makerTeam} +${hand.pointsAwarded[hand.makerTeam ?? 0]}`;
}

function formatRate(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function recordLabel(record: TrendRecord): string {
  return `${record.wins}-${record.losses} (${formatRate(record.winPercentage)})`;
}

function streakLabel(streak: ProfileTrendStats["currentStreak"]): string {
  if (streak.result === "none") {
    return "none";
  }

  return `${streak.result === "win" ? "W" : "L"}${streak.count}`;
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
  act: (action: GameAction) => void | Promise<void>;
  disabled: boolean;
}) {
  const [selectedReplacementIds, setSelectedReplacementIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedReplacementIds([]);
  }, [state.handNumber, state.phase, state.activePlayer]);

  if (state.phase === "idle") {
    return null;
  }

  if (state.phase === "farmersHand") {
    const legal = legalActionsForPlayer(state, state.activePlayer);
    const humanTurn = state.activePlayer === 0;
    const eligibleIds = new Set(legal.farmersHandReplaceableCards.map(cardId));
    const selectedCards = selectedFarmersHandReplacementCards(state.hands[state.activePlayer], selectedReplacementIds);
    const selectedCount = selectedCards.length;

    function toggleReplacementCard(card: Card) {
      const id = cardId(card);
      if (!eligibleIds.has(id)) {
        return;
      }

      setSelectedReplacementIds((current) => toggleFarmersHandReplacementSelection({
        selectedIds: current,
        card,
        eligibleCards: legal.farmersHandReplaceableCards
      }));
    }

    return (
      <section className="flex flex-col gap-3 rounded border border-white/10 bg-white/[0.04] p-4">
        <div>
          <p className="text-sm font-semibold text-white">{PLAYER_NAMES[state.activePlayer]} to check Farmer&apos;s Hand</p>
          <p className="mt-1 text-sm text-white/55">
            Qualifying hands contain only 9s and 10s. Declining moves bidding to the next player.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border border-white/20 px-3 py-2 text-sm text-white"
            disabled={disabled || !humanTurn || !legal.canDeclineFarmersHand}
            onClick={() => act({ type: "FARMERS_HAND_DECLINE", player: state.activePlayer })}
          >
            Decline
          </button>
          {state.config.farmersHandMode === "redeal" ? (
            <button
              className="rounded bg-brass px-3 py-2 text-sm font-semibold text-[#201602]"
              disabled={disabled || !humanTurn || !legal.canClaimFarmersHand}
              onClick={() => act({ type: "FARMERS_HAND_REDEAL", player: state.activePlayer, seed: Date.now() % 1_000_000 })}
            >
              Claim redeal
            </button>
          ) : null}
          {state.config.farmersHandMode === "replaceThree" ? (
            <button
              className="rounded bg-brass px-3 py-2 text-sm font-semibold text-[#201602]"
              disabled={disabled || !humanTurn || !legal.canClaimFarmersHand || selectedCount === 0}
              onClick={() => act({ type: "FARMERS_HAND_REPLACE", player: state.activePlayer, cards: selectedCards })}
            >
              Replace Selected
            </button>
          ) : null}
          {!humanTurn ? <span className="text-sm text-white/50">Bot checking...</span> : null}
        </div>
        {state.config.farmersHandMode === "replaceThree" && humanTurn ? (
          <div className="rounded border border-white/10 bg-[#071411]/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Choose eligible low cards</p>
              <span className="text-sm text-brass">{selectedCount}/3 selected</span>
            </div>
            <p className="mt-1 text-xs text-white/45">{replacementSelectionLabel(selectedCards)}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {state.hands[state.activePlayer].map((card) => {
                const id = cardId(card);
                const eligible = eligibleIds.has(id);
                const selected = selectedReplacementIds.includes(id);
                const selectionBlocked = !selected && selectedCount >= 3;

                return (
                  <button
                    key={id}
                    className={`h-16 rounded border px-2 text-lg font-bold shadow-sm ${
                      selected
                        ? "border-brass bg-brass text-[#201602]"
                        : eligible
                          ? "border-white/30 bg-white text-[#071411]"
                          : "border-white/10 bg-white/20 text-white/35"
                    }`}
                    disabled={disabled || !eligible || selectionBlocked}
                    onClick={() => toggleReplacementCard(card)}
                  >
                    {cardLabel(card)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-white/45">
              Eligible cards are 9s and 10s only. Non-eligible cards and a fourth selection are disabled.
            </p>
          </div>
        ) : null}
      </section>
    );
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
  const humanTurn = state.activePlayer === 0;

  return (
    <section className="flex flex-col gap-3 rounded border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-white">{PLAYER_NAMES[state.activePlayer]} to bid</span>
        {humanTurn ? (
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={alone} onChange={(event) => setAlone(event.target.checked)} />
            Alone
          </label>
        ) : <span className="text-sm text-white/50">Bot thinking...</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border border-white/20 px-3 py-2 text-sm text-white"
          disabled={disabled || !humanTurn || !legal.canPass}
          onClick={() => act({ type: "PASS", player: state.activePlayer })}
        >
          Pass
        </button>
        {state.phase === "ordering" ? (
          <button
            className="rounded bg-brass px-3 py-2 text-sm font-semibold text-[#201602]"
            disabled={disabled || !humanTurn || !legal.canOrderUp}
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
                disabled={disabled || !humanTurn}
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
  act: (action: GameAction) => void | Promise<void>;
  disabled: boolean;
}) {
  const legal = legalActionsForPlayer(state, player);
  const playable = new Set(legal.playableCards.map(cardId));
  const isActive = state.activePlayer === player;
  const humanSeat = player === 0;

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
          const enabled = humanSeat && (legal.mustDiscard || playable.has(cardId(card)));
          return (
            <button
              key={cardId(card)}
              data-seat={player}
              data-testid={`seat-${player}-card-${cardId(card)}`}
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
    case "FARMERS_HAND_DECLINE":
      return `${PLAYER_NAMES[action.player]} declined Farmer's Hand`;
    case "FARMERS_HAND_REDEAL":
      return `${PLAYER_NAMES[action.player]} claimed Farmer's Hand redeal with seed ${action.seed}`;
    case "FARMERS_HAND_REPLACE":
      return `${PLAYER_NAMES[action.player]} replaced ${action.cards.map(cardLabel).join(", ")} for Farmer's Hand`;
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

function gameWinner(state: GameState): 0 | 1 | null {
  if (state.phase !== "gameComplete") {
    return null;
  }

  if (state.scores[0] >= state.config.targetScore) {
    return 0;
  }

  if (state.scores[1] >= state.config.targetScore) {
    return 1;
  }

  return null;
}
