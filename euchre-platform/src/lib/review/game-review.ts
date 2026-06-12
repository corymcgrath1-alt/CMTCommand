import {
  applyMoveEvent,
  createInitialGameState,
  teamOf,
  type GameConfig,
  type GameState,
  type HandResult,
  type PlayerIndex,
  type TeamIndex,
  type Trick
} from "@/lib/euchre";
import {
  persistedEventToMoveEvent,
  type PersistedMoveEventRecord
} from "@/lib/persistence/event-store";

const SEATS = [0, 1, 2, 3] as const;
const TEAMS = [0, 1] as const;

export interface TeamReviewStats {
  team: TeamIndex;
  pointsScored: number;
  handsWon: number;
  makerHands: number;
  successfulMakerHands: number;
  failedMakerHands: number;
  defenderEuchres: number;
  tricksWon: number;
  loneAttempts: number;
  successfulLoners: number;
}

export interface SeatReviewStats {
  seat: PlayerIndex;
  team: TeamIndex;
  handsDealt: number;
  timesDealer: number;
  timesCaller: number;
  successfulCalls: number;
  failedCalls: number;
  loneAttempts: number;
  successfulLoners: number;
  tricksWon: number;
  cardsPlayed: number;
  firstTricksWon: number;
  finalTricksWon: number;
}

export interface CompletedHandReview {
  handNumber: number;
  dealer: PlayerIndex;
  maker?: PlayerIndex;
  makerTeam?: TeamIndex;
  pointsAwarded: [number, number];
  tricksWon: [number, number];
  euchred: boolean;
  lone: boolean;
  loneSucceeded: boolean;
  passed: boolean;
}

export interface GameReviewSummary {
  gameId: string;
  winningTeam: TeamIndex;
  finalScore: [number, number];
  totalHandsPlayed: number;
  totalEvents: number;
  totalTricksPlayed: number;
  totalEuchres: number;
  totalSuccessfulMakerHands: number;
  totalFailedMakerHands: number;
  totalLoneAttempts: number;
  totalSuccessfulLoneHands: number;
  totalDealerPickups: number;
  totalPassedHands: number;
  longestScoringStreakByTeam: [number, number];
  teams: [TeamReviewStats, TeamReviewStats];
  seats: [SeatReviewStats, SeatReviewStats, SeatReviewStats, SeatReviewStats];
  hands: CompletedHandReview[];
}

export class GameReviewUnavailableError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
    this.name = "GameReviewUnavailableError";
  }
}

export function buildGameReview({
  gameId,
  config,
  events
}: {
  gameId: string;
  config: GameConfig;
  events: PersistedMoveEventRecord[];
}): GameReviewSummary {
  const orderedEvents = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  if (orderedEvents.length === 0) {
    throw new GameReviewUnavailableError("Cannot generate review without move events", 422);
  }

  let state: GameState = { ...createInitialGameState(config), id: gameId };
  const teams = makeTeamStats();
  const seats = makeSeatStats();
  const hands: CompletedHandReview[] = [];
  let totalDealerPickups = 0;
  let currentScoringTeam: TeamIndex | null = null;
  let currentScoringStreak = 0;
  const longestScoringStreakByTeam: [number, number] = [0, 0];

  for (const event of orderedEvents) {
    const move = persistedEventToMoveEvent(event);
    const before = state;
    state = applyMoveEvent(state, move);

    if (event.eventType === "START_HAND" || event.eventType === "NEXT_HAND") {
      seats[state.dealer].handsDealt += 1;
      seats[state.dealer].timesDealer += 1;
    }

    if (event.eventType === "ORDER_UP") {
      totalDealerPickups += 1;
    }

    if (event.eventType === "PLAY_CARD" && event.player !== undefined) {
      seats[event.player].cardsPlayed += 1;
    }

    if (isNewlyCompletedHand(before, state)) {
      const completedHand = summarizeCompletedHand(state);
      hands.push(completedHand);
      applyHandStats(completedHand, state.completedTricks, teams, seats);

      const scoringTeam = scoringTeamFor(completedHand.pointsAwarded);
      if (scoringTeam === null) {
        currentScoringTeam = null;
        currentScoringStreak = 0;
      } else {
        currentScoringStreak = currentScoringTeam === scoringTeam ? currentScoringStreak + 1 : 1;
        currentScoringTeam = scoringTeam;
        longestScoringStreakByTeam[scoringTeam] = Math.max(
          longestScoringStreakByTeam[scoringTeam],
          currentScoringStreak
        );
      }
    }
  }

  if (state.phase !== "gameComplete") {
    throw new GameReviewUnavailableError("Game review is available after game completion");
  }

  const winningTeam = state.scores[0] >= config.targetScore ? 0 : 1;

  return {
    gameId,
    winningTeam,
    finalScore: [...state.scores],
    totalHandsPlayed: hands.length,
    totalEvents: orderedEvents.length,
    totalTricksPlayed: hands.reduce((total, hand) => total + hand.tricksWon[0] + hand.tricksWon[1], 0),
    totalEuchres: hands.filter((hand) => hand.euchred).length,
    totalSuccessfulMakerHands: hands.filter((hand) => !hand.passed && !hand.euchred).length,
    totalFailedMakerHands: hands.filter((hand) => hand.euchred).length,
    totalLoneAttempts: hands.filter((hand) => hand.lone).length,
    totalSuccessfulLoneHands: hands.filter((hand) => hand.loneSucceeded).length,
    totalDealerPickups,
    totalPassedHands: hands.filter((hand) => hand.passed).length,
    longestScoringStreakByTeam,
    teams,
    seats,
    hands
  };
}

function makeTeamStats(): [TeamReviewStats, TeamReviewStats] {
  return TEAMS.map((team) => ({
    team,
    pointsScored: 0,
    handsWon: 0,
    makerHands: 0,
    successfulMakerHands: 0,
    failedMakerHands: 0,
    defenderEuchres: 0,
    tricksWon: 0,
    loneAttempts: 0,
    successfulLoners: 0
  })) as [TeamReviewStats, TeamReviewStats];
}

function makeSeatStats(): [SeatReviewStats, SeatReviewStats, SeatReviewStats, SeatReviewStats] {
  return SEATS.map((seat) => ({
    seat,
    team: teamOf(seat),
    handsDealt: 0,
    timesDealer: 0,
    timesCaller: 0,
    successfulCalls: 0,
    failedCalls: 0,
    loneAttempts: 0,
    successfulLoners: 0,
    tricksWon: 0,
    cardsPlayed: 0,
    firstTricksWon: 0,
    finalTricksWon: 0
  })) as [SeatReviewStats, SeatReviewStats, SeatReviewStats, SeatReviewStats];
}

function isNewlyCompletedHand(before: GameState, after: GameState): boolean {
  return (
    before.phase !== "handComplete" &&
    before.phase !== "gameComplete" &&
    (after.phase === "handComplete" || after.phase === "gameComplete")
  );
}

function summarizeCompletedHand(state: GameState): CompletedHandReview {
  if (!state.handResult) {
    return {
      handNumber: state.handNumber,
      dealer: state.dealer,
      pointsAwarded: [0, 0],
      tricksWon: [0, 0],
      euchred: false,
      lone: false,
      loneSucceeded: false,
      passed: true
    };
  }

  return {
    handNumber: state.handNumber,
    dealer: state.dealer,
    maker: state.handResult.maker,
    makerTeam: state.handResult.makers,
    pointsAwarded: [...state.handResult.pointsAwarded],
    tricksWon: [...state.handResult.tricksWon],
    euchred: state.handResult.euchred,
    lone: state.handResult.lone,
    loneSucceeded: isSuccessfulLoner(state.handResult),
    passed: false
  };
}

function applyHandStats(
  hand: CompletedHandReview,
  tricks: Trick[],
  teams: [TeamReviewStats, TeamReviewStats],
  seats: [SeatReviewStats, SeatReviewStats, SeatReviewStats, SeatReviewStats]
): void {
  for (const team of TEAMS) {
    teams[team].pointsScored += hand.pointsAwarded[team];
    teams[team].tricksWon += hand.tricksWon[team];
    if (hand.pointsAwarded[team] > 0) {
      teams[team].handsWon += 1;
    }
  }

  if (hand.maker !== undefined && hand.makerTeam !== undefined) {
    const makerTeam = hand.makerTeam;
    const defenderTeam = makerTeam === 0 ? 1 : 0;
    teams[makerTeam].makerHands += 1;
    seats[hand.maker].timesCaller += 1;

    if (hand.euchred) {
      teams[makerTeam].failedMakerHands += 1;
      teams[defenderTeam].defenderEuchres += 1;
      seats[hand.maker].failedCalls += 1;
    } else {
      teams[makerTeam].successfulMakerHands += 1;
      seats[hand.maker].successfulCalls += 1;
    }

    if (hand.lone) {
      teams[makerTeam].loneAttempts += 1;
      seats[hand.maker].loneAttempts += 1;
    }

    if (hand.loneSucceeded) {
      teams[makerTeam].successfulLoners += 1;
      seats[hand.maker].successfulLoners += 1;
    }
  }

  for (const trick of tricks) {
    if (trick.winner === undefined) {
      continue;
    }

    seats[trick.winner].tricksWon += 1;
  }

  const firstWinner = tricks[0]?.winner;
  if (firstWinner !== undefined) {
    seats[firstWinner].firstTricksWon += 1;
  }

  const finalWinner = tricks[tricks.length - 1]?.winner;
  if (finalWinner !== undefined) {
    seats[finalWinner].finalTricksWon += 1;
  }
}

function scoringTeamFor(pointsAwarded: [number, number]): TeamIndex | null {
  if (pointsAwarded[0] > 0) {
    return 0;
  }

  if (pointsAwarded[1] > 0) {
    return 1;
  }

  return null;
}

function isSuccessfulLoner(handResult: HandResult): boolean {
  return handResult.lone && handResult.march;
}
