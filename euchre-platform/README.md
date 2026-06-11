# Euchre Platform

Phase 1 foundation for a production-minded online/mobile Euchre platform.

## Phase 1 Scope

- Complete deterministic Euchre rules engine in TypeScript
- State machine for deal, bidding, dealer pickup/discard, trick play, hand scoring, and game completion
- Legal move validation
- Move log and replay helpers
- Local multiplayer UI
- Bot placeholders only
- Supabase/Postgres-ready model types
- Vitest unit tests for rules logic

Not included yet: tournaments, leagues, cosmetics, chat, clubs, spectator mode, ranked matchmaking, or AI coaching.

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
