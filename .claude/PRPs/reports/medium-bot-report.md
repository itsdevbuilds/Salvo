---
type: summary
status: complete
tags: [salvo, battleship, bot, hunt-target, parity, phase-2, implementation-report]
relatedTo: [salvo, salvo-battleship-prd, medium-bot-plan]
---

# Implementation Report: Medium Bot

## Summary
The game now uses `huntTarget`, a stateless hunt/target bot with checkerboard parity, in place of the random stand-in. Over 300 seeded games against random fleets it needs **51.0 shots on average, against 95.2 for `randomShot`**. `randomShot` stays as the Easy tier, and both satisfy a new `Bot` type. The bot still receives only the shots map, and `GameState` is unchanged.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Small | Small |
| Confidence | 9/10 | Single pass, no failures |
| Files Changed | 5 | 5 + this report |
| Bot strength | ~62–66 avg, assert < 75 | 51.0 avg; assertion tightened to < 60 and ≥ 30 below random |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | `Bot` type + `huntTarget` | Complete | `randomShot` rewritten as a `Bot` const sharing `openCells` / `pick` |
| 2 | Reducer wiring | Complete | No existing reducer test pinned bot cells |
| 3 | Tests | Complete | 9 new tests |
| 4 | Docs | Complete | CLAUDE.md bot bullet; PRD phase + decisions log |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc -b` exit 0, `oxlint` exit 0 |
| Unit Tests | Pass | 49/49 (9 new); bot suite ~0.4s |
| Build | Pass | 227.1 kB JS / 71.4 kB gzip |
| Integration (browser) | Pass | Full game on dev server: bot won in 54 shots; all 17 follow-ups after an open hit stayed on that hit's row/column; no console errors |
| Edge Cases | Pass | First shot, full board, edge/corner no-wrap (A10, B1), blocked line end, sunk cells ignored |

## Files Changed

| File | Action | Lines |
|---|---|---|
| `src/game/bot.ts` | UPDATED | +56 / -5 |
| `src/game/bot.test.ts` | UPDATED | +79 / -2 |
| `src/game/reducer.ts` | UPDATED | +2 / -2 |
| `CLAUDE.md` | UPDATED | +1 / -1 |
| `.claude/PRPs/prds/salvo-battleship.prd.md` | UPDATED | Phase 2 complete, decisions-log row |
| `.claude/PRPs/reports/medium-bot-report.md` | CREATED | this file |

## Deviations from Plan
- **Stronger than the published figures (51 vs 62–66 shots).** We think the line-end-first targeting plus parity hunting beats the basic hunt/target the sources describe. The bot can't cheat, because it only ever reads `state.player.shots`. The test threshold was tightened to `< 60` so a regression is caught.
- **`randomShot` became `export const randomShot: Bot = ...`** (it was a function declaration), so both tiers are checked against `Bot`. Its behaviour is unchanged and its test is untouched.
- **The branch carried the uncommitted plan and PRD edits from `main`.** They belong to this feature.

## Issues Encountered
None. The GateGuard fact-forcing hook required stating facts before each first-time write.

## Observations
- At about 51 shots, Medium may beat casual players often. The PRD "Bot feel" metric needs the Phase 5 playtest. `randomShot` is ready if an Easy option is wanted.
- A bot reply delay (Phase 4) would make the target-mode follow-ups visible to the player.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `src/game/bot.test.ts` | +9 (10 total) | parity hunt, parity fallback, lone hit, line both axes, blocked end, row-wrap edges, sunk ignored, exhausted board, 300-game simulation vs random |

## Next Steps
- [ ] `/code-review`
- [ ] `/prp-commit` + `/prp-pr` on `feat/medium-bot`
- [ ] `/prp-plan` Phase 4 (Mobile + polish)
