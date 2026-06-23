# Euchre Platform

Phase 1 foundation for a production-minded online/mobile Euchre platform.

## Phase 1 Scope

- Complete deterministic Euchre rules engine in TypeScript
- State machine for deal, bidding, dealer pickup/discard, trick play, hand scoring, and game completion
- Legal move validation
- Move log and replay helpers
- Local multiplayer UI
- Deterministic beginner/intermediate bot heuristics
- Supabase/Postgres-ready model types
- Vitest unit tests for rules logic

Not included yet: tournaments, leagues, cosmetics, chat, clubs, spectator mode, ranked matchmaking, or AI coaching.

## Bot Strategy v1

West, North, and East now use deterministic beginner/intermediate Euchre heuristics
instead of placeholder "first legal move" behavior. Bot decisions score trump strength
with Euchre-aware features such as bowers, trump aces, trump count, off-suit aces, dealer
context, next-suit logic, conservative lone-hand thresholds, pickup/discard value, and
current trick control. Card play always starts from the engine's legal move list, including
left-bower effective suit handling, then chooses deterministic leads, lowest winning cards,
partner-safe low cards, or weakest discards.

Single-player games can be created with Easy, Standard, or Strong bot difficulty. The
selected difficulty is persisted in the game config, so replay, review, and profile stats
can reconstruct games from the same event history without relying on UI-only state.
Existing games without a difficulty field default to Standard for backward compatibility.
Easy bots make legal but more conservative and less polished decisions. Standard is the
default beginner/intermediate strategy. Strong tightens bidding, next-suit recognition,
discarding, and trick-play conservation while remaining deterministic.

The strategy is intentionally below expert level. It does not run simulations, model
opponents, run bot-vs-bot calibration reports, or provide coaching explanations yet.
Future work can add stronger search/simulation-based bots, difficulty calibration, and AI
hand-review commentary without changing the replay-safe event log model.

## Single-Player House Rules v1

New persisted games can be configured with target score `5`, `10`, `15`, or `21`;
bot difficulty `Easy`, `Standard`, or `Strong`; dealer selection `Default`, `Human`,
or an explicit seat `0` through `3`; stick-the-dealer; Farmer's Hand mode; loner mode;
and an optional practice seed. These settings are stored in the game config, so replay,
review, profile aggregation, and old-game loading all reconstruct from the same
append-only event history. Existing games without newer config fields default to target
score `10`, Standard bots, Default dealer, Farmer's Hand off, and `aloneOnly` loners.

Farmer's Hand v1 supports three modes:

- `off`: current standard bidding flow; no Farmer's Hand phase.
- `redeal`: after the deal and before bidding, a qualifying player may claim Farmer's
  Hand and redeal the same hand number with the same dealer using a persisted seed.
- `replaceThree`: a qualifying player may exchange one to three qualifying low cards
  with the non-upcard kitty cards. The exchange is stored as an immutable move event.

The conservative v1 Farmer's Hand qualifier is: the hand contains only 9s and 10s. In
this 24-card deck that is equivalent to "no ace, king, queen, or jack." Regional variants
vary widely, so future config can add additional qualifier modes without changing the
event-sourced structure.

Loner mode currently persists `aloneOnly` and `withPartnerAllowed`. `aloneOnly` preserves
the existing standard lone-hand behavior and scoring. `withPartnerAllowed` is intentionally
stored and labeled as an assisted-loner variant setting, but full assisted-loner gameplay
is deferred until its regional semantics are chosen. The current engine does not change
lone-hand scoring or partner sit-out behavior for that variant.

Deferred regional rules include Canadian loner, partner's best card, no ace/no face
variants, Benny/Joker, must-trump-if-void, partner order-up restrictions, and custom
misdeal rules.

## House Rules Polish v2

House Rules Polish v2 keeps the same event-sourced model while making custom rules easier
to trust in single-player games. The setup area now includes concise help text for
Farmer's Hand, stick-the-dealer, loner mode, and seed practice. Invalid API setup values
for target score, bot difficulty, dealer selection, Farmer's Hand mode, or loner mode are
rejected instead of being persisted into a corrupt game.

Manual Farmer's Hand replacement is supported for the human player in `replaceThree`
mode. When South qualifies, the UI shows the current hand, marks eligible low cards,
tracks `0/3` through `3/3` selected, disables non-eligible cards, prevents a fourth
selection, and only appends `FARMERS_HAND_REPLACE` after one to three cards are selected.
The selected card payload is still validated by the API schema and deterministic engine,
and replay reconstruction uses the exact cards stored in the immutable event.

Rule summaries are generated by a pure helper from normalized game config plus the first
deal seed in the event history. The current game summary, completed Game Review panel,
and profile game-history rows all show the active rule set. Old games without newer
config fields render normalized defaults safely.

Seed practice is intentionally simple: enter a numeric seed before creating a game to
repeat the first deal with the same config, or copy the active seed after game creation.
The seed is persisted in the `START_HAND` move event, so replay, review, and rule summary
output can recover it from event history. Blank or invalid seed input falls back to a
generated normalized seed rather than corrupting game setup.

Assisted-loner mode remains deferred. The app can persist and summarize
`withPartnerAllowed` for future regional-rule support, but current gameplay and scoring
continue to use standard lone-hand behavior.

## Single-Player Game UX Polish v1

Single-player gameplay now includes state-derived turn prompts, legal-action
explanations, post-hand scoring text, safer game controls, and recent bot activity. These
helpers are display-only: they read existing game state, move events, normalized config,
and review data, and they do not change rules, scoring, persistence, bot strategy, replay
reconstruction, or profile aggregation.

The table explains the current phase, including Farmer's Hand checks, ordering up,
round-two trump calls, dealer discard, trick play, hand completion, and game completion.
Human turns include short action explanations such as dealer/upcard context during
bidding, follow-suit or void-in-suit messaging during card play, and eligible-card counts
during Farmer's Hand replacement.

After a hand completes, the UI summarizes who made trump, the trump suit, maker and
defender tricks, scoring reason, points awarded, and score after hand. Game-complete
controls distinguish Review Game from Start New Game. Starting a new active table clears
only the local active table selection; completed games and historical move events remain
available through profile history and review.

Recent bot activity is derived from the move log and shown compactly, for example passes,
trump calls, discards, card plays, and Farmer's Hand actions.

Deferred UX polish includes a full card-table layout, animations, sound/haptics, tutorial
mode, card-by-card replay animation, an accessibility pass, and a mobile layout pass.

## Run

```powershell
npm install
npm run dev
```

## Verify

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

## Game Review v1

Completed persisted games can be reviewed through `GET /api/games/[gameId]/review`.
The summary is generated by replaying the append-only move event history, so stats are
reconstructed from the same deterministic source of truth as the game state rather than
from mutable UI counters.

Included v1 stats: winner, final score, hands/events/tricks, euchres, maker success and
failure, lone attempts and successful loners, dealer pickups, passed hands, scoring
streaks, per-team totals, and per-seat caller/trick/card/dealer counts. The same review
payload also includes hand-by-hand and trick-by-trick replay details: dealer, upcard,
trump, caller, bidding rounds, pickup/discard, scoring result, score after hand, trick
leaders, cards played in order, trick winners, led suit, trump usage, and each trick
winner's relationship to the caller.

Completed games also show a lightweight hand replay viewer in the review panel. The
viewer lets a player select hands, step through tricks, and inspect leader, led suit,
trump, winning card, winning seat, and every card played in order. Replay data is derived
from the event history through the review payload, so future analysis features can build
on the same deterministic reconstruction path instead of a separate UI-only replay model.

## Basic Profile Aggregates v1

`GET /api/profiles` derives local placeholder profile stats from completed game reviews:
South / Human, West Bot, North Bot, and East Bot. The endpoint lists completed persisted
games, rebuilds each review from the append-only move history, and rolls those reviews up
into per-player and per-team aggregates. These are intentionally seat-based identities for
now; later account/user IDs can replace the placeholder profile IDs without changing the
event-history source of truth.

Included v1 profile stats: games played, wins/losses, win percentage, points for/against,
hands played, dealer/caller counts, call success, lone attempts and successful loners,
tricks won, cards played, team final scores, average team points, maker success, euchres
earned, and euchres suffered.

`GET /api/profiles/[seat]` returns a per-player detail view for local seats `0` through
`3`. Detail views include career summary, completed-game history rows, last-5 and last-10
records, recent win/call/trick trends, current streak, best win streak, and worst losing
streak. The UI lets a player select a local placeholder profile from the sidebar and shows
the same detail data without creating a second client-side stats source.

Profile game-history rows can open completed game reviews directly from the sidebar. The
drilldown fetches the existing `GET /api/games/[gameId]/review` payload and reuses the
same Game Review and Hand Replay panel, so historical inspection stays derived from the
append-only event history. This is the local foundation for future shareable game links,
AI mistake review, and player improvement workflows.

Deferred intentionally: real accounts, ranked/profile ratings, partner/opponent splits,
opponent-adjusted stats, mistake detection, expected value, skill scoring, advanced bot or
human decision quality, AI coaching, shareable hand links, spectator mode, realtime
cross-device review sharing, and tournament/league reporting.
