---
type: summary
status: complete
tags: [salvo, battleship, core-ui, phase-3, react, useReducer, pointer-events, implementation-report]
relatedTo: [salvo, salvo-battleship-prd, core-ui-plan]
---

# Implementation Report: Core UI

## Summary
Salvo is playable end to end in the browser. Placement supports drag (mouse and touch), tap-to-place, picking up and moving a placed ship, rotate and randomize. Battle shows two 10×10 grids against a stand-in random bot, with a status line reporting both shots, a win/lose message and Play again. Game flow is a pure reducer in `src/game/reducer.ts`; React only renders and dispatches. No new dependencies.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium |
| Confidence | 8/10 | Single pass; all checks green on the first run |
| Files Changed | 11 (6 create, 5 update) | 11 + PRD (7 create incl. this report, 5 update) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Shared test rng | Complete | `src/game/test-utils.ts` |
| 2 | `cellName` | Complete | |
| 3 | Stand-in bot | Complete | `randomShot(shots, rng)` |
| 4 | Game reducer | Complete | As planned |
| 5 | Reducer tests | Complete | +1 extra test: moving a ship onto cells it already covers |
| 6 | Grid component | Complete | Deviated: `onCellDown` takes only `cell` (event was unused) |
| 7 | App wiring | Complete | Deviated: touch pointerup clears hover so the preview doesn't linger; added a one-line hint |
| 8 | Styles | Complete | Template CSS removed (closes code-review finding) |
| 9 | Docs | Complete | CLAUDE.md + PRD decisions log |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc -b` exit 0, `oxlint` exit 0 |
| Unit Tests | Pass | 36/36 (18 new) |
| Build | Pass | 225.7 kB JS / 70.8 kB gzip, 2.1 kB CSS |
| Integration (browser) | Pass | chrome-devtools MCP against the dev server |
| Edge Cases | Pass | See below |

Browser checks performed:
- Mouse drag from the tray to C3: green preview (5 cells), carrier placed at 22–26.
- Hover over an invalid spot: red preview, nothing placed.
- Tap-to-place battleship at 50.
- Plain tap on a placed ship: it doesn't move. Press-drag-release: it moves to 90.
- Start stays disabled until 5 ships are placed.
- Rotate label toggles; Randomize gives 17 ship cells.
- Before game over: 0 enemy ship cells in classes or aria-labels (no leak).
- Full game to the end: shot cells disabled, enemy revealed at game over, all cells inert, Play again resets.
- Mobile emulation 375×667 touch: touch drag via implicit capture placed the carrier at 33–37; `touch-action: none` applied; 33px cells; no horizontal scroll; boards stack.
- Console: no errors except a 404 for `/favicon.ico` (removed in Phase 1; Phase 4 adds an icon).

## Files Changed

| File | Action | Lines |
|---|---|---|
| `src/game/test-utils.ts` | CREATED | +9 |
| `src/game/bot.ts` | CREATED | +8 |
| `src/game/bot.test.ts` | CREATED | +19 |
| `src/game/reducer.ts` | CREATED | +112 |
| `src/game/reducer.test.ts` | CREATED | +119 |
| `src/Grid.tsx` | CREATED | +43 |
| `src/App.tsx` | UPDATED | 3 → 131 |
| `src/index.css` | UPDATED | 111 → 176 (full replace) |
| `src/game/engine.ts` | UPDATED | +2 (`cellName`) |
| `src/game/engine.test.ts` | UPDATED | `seeded` moved out, +`cellName` test |
| `CLAUDE.md` | UPDATED | +3 architecture bullets |
| `.claude/PRPs/prds/salvo-battleship.prd.md` | UPDATED | Phase 3 complete; decisions log |

## Deviations from Plan
- `Grid` `onCellDown(cell)` with no event argument. The event was never used (YAGNI).
- After a touch `pointerup`, hover is cleared so the next ship's preview doesn't stay stuck under the lifted finger.
- Added a hint line ("Drag or tap ships onto your grid. Press a placed ship to move it.").
- Drag-and-drop uses native pointer events instead of `@dnd-kit/core`, as planned; recorded in the PRD decisions log.

## Issues Encountered
- The chrome-devtools MCP can't write screenshots to the scratchpad (outside its workspace roots). Took an inline screenshot instead.

## Observations for Phase 4
- On a phone the enemy grid is below the fold, so the player scrolls every turn. This bears on the PRD open question "one board at a time vs. stacked".
- Miss dots are low-contrast in dark mode.
- The bot replies instantly, so both results appear at once. A short delay would help.
- Placement is not keyboard-only (Randomize is the keyboard path).

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `src/game/reducer.test.ts` | 16 | initialState, place/move/overlap/off-board, rotate, randomize, start guard, fire/repeat/wrong phase, full game, reset |
| `src/game/bot.test.ts` | 1 | randomShot uniqueness + exhaustion |
| `src/game/engine.test.ts` | +1 | cellName |

## Next Steps
- [ ] Code review via `/code-review`
- [ ] Commit / PR via `/prp-commit` or `/prp-pr` (Phases 1 and 3 are both uncommitted on `feat/scaffold-and-engine`)
- [ ] `/prp-plan` Phase 2 (Medium bot): swap the body of `src/game/bot.ts`
