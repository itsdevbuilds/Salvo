---
type: plan
status: complete
tags: [salvo, battleship, bot, ai, hunt-target, parity, phase-2]
relatedTo: [salvo, salvo-battleship-prd, core-ui-plan, scaffold-and-engine-plan]
---

# Plan: Medium Bot (hunt/target + parity)

## Summary
Replace the random stand-in bot with a hunt/target bot that uses checkerboard parity while hunting. The bot stays a pure, stateless function of its own shot history `(shots, rng) => Cell`, so the reducer needs only a one-word swap. Strength is proven by simulated games in Vitest: the average game length must sit well below the random bot's.

## User Story
As a casual player, I want the bot to follow up on its hits like a person would, so that the game feels like a real opponent instead of a coin flip.

## Problem → Solution
`randomShot` fires anywhere and ignores hits (~96 shots to finish) → `huntTarget` checks a checkerboard while hunting and sinks a ship once it finds it (~62–66 shots on published figures).

## Metadata
- **Complexity**: Small
- **Source PRD**: `.claude/PRPs/prds/salvo-battleship.prd.md`
- **PRD Phase**: 2: Medium bot
- **Estimated Files**: 5 (0 create, 5 update)

---

## UX Design

Internal change; there are no new UI elements. Behaviour the player will notice:

| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Bot reply after hitting you | Next shot is random | Next shot is next to the hit, then follows the ship's line | Status line text is unchanged |
| Game length | Bot needs ~96 shots | Bot needs ~65 shots | The player now loses a real share of games |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/game/bot.ts` | all | The file being rewritten; signature to keep |
| P0 | `src/game/engine.ts` | 13–19, 62–86 | `toCell/rowOf/colOf/inRange`, `fire` marks every cell of a sunk ship as `'sunk'` |
| P0 | `src/game/reducer.ts` | 1, 105–123 | The only bot call site (`randomShot(state.player.shots, action.rng)`) |
| P1 | `src/game/bot.test.ts` | all | Test style to extend |
| P1 | `src/game/test-utils.ts` | all | `seeded(seed)` mulberry32 rng |
| P2 | `src/game/types.ts` | all | `Cell`, `ShotResult`, `BOARD_SIZE`, `CELL_COUNT`, `FLEET` |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Hunt/target + parity | DataGenetics (Nick Berry), via the secondary sources in the PRD Research Summary | random ≈ 96 shots to win half of games; hunt/target ≈ 66 average; with parity ≈ 62–65 |

No new libraries. No further research needed.

---

## Key Insight: the bot needs no memory

`fire` (engine.ts:70–83) rewrites every cell of a ship to `'sunk'` once it sinks. So in the bot's shots map:
- `'hit'` = a hit on a ship that is **still afloat**. These are the open targets.
- `'sunk'` / `'miss'` = done.

So target mode can be rebuilt from `shots` on every call. There's no bot state in `GameState` and no change to the reducer's shape, and the bot still never sees the player's `Board`.

---

## Patterns to Mirror

### NAMING / SIGNATURE
```ts
// SOURCE: src/game/bot.ts:3-8
// stand-in until the Phase 2 hunt/target bot; sees only its own shot history, never the player's ships
export function randomShot(shots: ReadonlyMap<Cell, ShotResult>, rng: () => number = Math.random): Cell {
  const open = Array.from({ length: CELL_COUNT }, (_, c) => c).filter((c) => !shots.has(c))
  if (open.length === 0) throw new Error('randomShot: no cells left')
  return open[Math.floor(rng() * open.length)]
}
```

### ERROR_HANDLING
Invalid calls throw with a `fnName: reason` message (`engine.ts:41,44,71,72`; `bot.ts:6`). A full board is the only invalid call for a bot.

### CELL MATH
```ts
// SOURCE: src/game/engine.ts:13-19
export const toCell = (row: number, col: number): Cell => row * BOARD_SIZE + col
export const rowOf = (cell: Cell) => Math.floor(cell / BOARD_SIZE)
export const colOf = (cell: Cell) => cell % BOARD_SIZE
export const inRange = (cell: Cell) => Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT
```
GOTCHA: going left or right with `cell ± 1` wraps rows. Step with row and col, then range-check each one; `inRange` alone isn't enough.

### TEST_STRUCTURE
```ts
// SOURCE: src/game/bot.test.ts:1-8
import { describe, it, expect } from 'vitest'
import { randomShot } from './bot'
import { seeded } from './test-utils'
import { type Cell, type ShotResult } from './types'
```
No semicolons, single quotes, `import { type X }`, explicit vitest imports, seeded rng.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/game/bot.ts` | UPDATE | Add `Bot` type and `huntTarget`; keep `randomShot` as the future Easy tier |
| `src/game/bot.test.ts` | UPDATE | Unit cases plus a simulated-games strength check |
| `src/game/reducer.ts` | UPDATE | Import and call `huntTarget` in place of `randomShot` |
| `CLAUDE.md` | UPDATE | Replace the "stand-in" bot bullet |
| `.claude/PRPs/prds/salvo-battleship.prd.md` | UPDATE | Phase 2 status and links |

## NOT Building

- Difficulty picker / Easy / Hard UI. The `Bot` type only leaves room for them.
- Probability-density (Hard) bot.
- Inferring remaining ship lengths to widen parity spacing. Sunk cells aren't grouped per ship, and adjacent ships make it ambiguous. Parity 2 is enough for Medium.
- Bot "thinking" delay or animations (Phase 4).
- Any change to `GameState` or new reducer actions.

---

## Step-by-Step Tasks

### Task 1: `Bot` type + `huntTarget` in `src/game/bot.ts`
- **ACTION**: Add the bot next to `randomShot`, and update the stand-in comment on `randomShot` to "Easy tier".
- **IMPLEMENT**:
  ```ts
  import { colOf, rowOf, toCell } from './engine'
  import { BOARD_SIZE, CELL_COUNT, type Cell, type ShotResult } from './types'

  // every bot tier: sees only its own shot history, never the player's ships
  export type Bot = (shots: ReadonlyMap<Cell, ShotResult>, rng?: () => number) => Cell

  const pick = (cells: readonly Cell[], rng: () => number) => cells[Math.floor(rng() * cells.length)]

  // the cell one step from `cell` along (dr, dc), or null off the board (no row wrap)
  function step(cell: Cell, dr: number, dc: number): Cell | null {
    const r = rowOf(cell) + dr
    const c = colOf(cell) + dc
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE ? toCell(r, c) : null
  }
  ```
  `huntTarget(shots, rng = Math.random)`:
  1. `open` = all unshot cells. Throw `'huntTarget: no cells left'` if empty.
  2. `hits` = cells whose result is `'hit'` (afloat ships; see Key Insight).
  3. **Target, line ends first**: for each hit and each axis (`[0,1]` and `[1,0]`), if the next cell along the axis is also `'hit'`, walk both directions through `'hit'` cells. The first non-hit cell at each end is a candidate if it's open. If there are any candidates, `pick` one.
  4. **Target, neighbours**: open orthogonal neighbours of any hit. If there are any, `pick` one.
  5. **Hunt**: open cells with `(rowOf(c) + colOf(c)) % 2 === 0`. If that's empty, use all `open`. Then `pick`.
- **MIRROR**: NAMING / SIGNATURE, CELL MATH, ERROR_HANDLING.
- **GOTCHA**:
  - Use `step`, not `±1`, so a hit at col 9 never targets col 0 of the next row.
  - Dedupe isn't needed for correctness: a duplicate only weights `pick` slightly. Leave it.
  - A line whose two ends are both blocked (by a miss, a sunk cell or the edge) falls through to step 4. This covers two side-by-side ships hit across their width.
  - `rng` defaults to `Math.random` (the reducer passes `action.rng`, which may be undefined).
- **VALIDATE**: `npx tsc -b`

### Task 2: Wire into the reducer
- **ACTION**: In `src/game/reducer.ts`, change line 1 to `import { huntTarget } from './bot'`, and line 110 to `const target = huntTarget(state.player.shots, action.rng)`.
- **GOTCHA**: The reducer tests in `reducer.test.ts` that play a full game use seeded rng. Any test that asserts on a specific bot target cell, or on message text with a bot cell in it, will change. Re-run them, and update the expected values only if the assertion is about a bot cell rather than about game flow.
- **VALIDATE**: `npx vitest run src/game/reducer.test.ts`

### Task 3: Tests in `src/game/bot.test.ts`
- **ACTION**: Keep the `randomShot` test. Add a `describe('huntTarget')` block, plus a small `play(bot, seed)` helper:
  ```ts
  // shots the bot needs to sink a random fleet
  function play(bot: Bot, seed: number) {
    const rng = seeded(seed)
    let board: Board = { ships: randomFleet(rng), shots: new Map() }
    let n = 0
    while (!allSunk(board)) {
      board = fire(board, bot(board.shots, rng)).board
      n++
    }
    return n
  }
  const average = (bot: Bot) => Array.from({ length: 300 }, (_, i) => play(bot, i + 1)).reduce((a, b) => a + b) / 300
  ```
  `fire` throws on a repeat or out-of-range shot, so `play` also proves the bot never repeats or leaves the board.
- **IMPORTS**: `allSunk, fire, randomFleet` from `./engine`; `type Board` from `./types`; `huntTarget, randomShot, type Bot` from `./bot`.
- **VALIDATE**: `npx vitest run src/game/bot.test.ts`. Print the measured averages once while writing (via `console.log`, then remove it). Set the threshold from that measurement with headroom, and record the figures in the report.

### Task 4: Docs
- **ACTION**:
  - `CLAUDE.md`: replace the `src/game/bot.ts` bullet with: "`huntTarget` (Medium) is stateless: it hunts on a checkerboard and targets unresolved `'hit'` cells, since `fire` turns a sunk ship's cells into `'sunk'`. `randomShot` is kept as the Easy tier. Both match the `Bot` type and receive only the shots map."
  - PRD: Phase 2 becomes `complete` with plan and report links (done by `/prp-implement`). Add a decisions-log row: "Medium bot | stateless hunt/target, parity 2 | stored bot memory in GameState; dynamic parity | sunk marking makes state derivable; ship grouping ambiguous".
- **VALIDATE**: Read both files back.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| hunts on parity | empty map, seeded, 20 calls (adding each as `'miss'`) | every cell has `(row+col) % 2 === 0` | |
| falls back off-parity | every parity cell shot as `'miss'` | returns an odd-parity open cell | yes |
| targets a lone hit | `{44:'hit'}` | result ∈ {34, 54, 43, 45} | |
| extends a line | `{44:'hit', 45:'hit'}` | result ∈ {43, 46} | |
| line blocked at one end | `{44:'hit', 45:'hit', 46:'miss'}` | 43 | yes |
| no row wrap | `{9:'hit'}` (A10) | result ∈ {8, 19}, never 10 | yes |
| ignores sunk cells | `{44:'sunk', 45:'sunk'}` over many seeds | always parity 0, never 35 / 54 (odd neighbours) | yes |
| throws when full | all 100 cells `'miss'` | throws | yes |
| finishes every game | `play(huntTarget, seed)` for 300 seeds | no throw, `n ≤ 100` | |
| beats random | `average(huntTarget)` vs `average(randomShot)` | Medium average < 75, and at least 20 shots below random | |

### Edge Cases Checklist
- [x] Empty history (first shot)
- [x] Full board (throws)
- [x] Edge and corner hits (no wrap)
- [x] Adjacent ships (blocked line falls back to neighbours; covered by 300 simulated games)
- [x] `rng` undefined (defaults to `Math.random`, same as the reducer path)

---

## Validation Commands

```bash
npx tsc -b            # zero type errors
npm run lint          # oxlint exit 0
npm test              # all suites green (current 40 + new)
npm run build         # succeeds
```

### Browser Validation
Dev server (`npm run dev`, already running on :5173): Randomize, then Start, then fire until the bot gets a hit. Confirm the bot's next shots land next to it and it sinks the ship within a few turns. Check that no console errors appear.

### Manual Validation
- [ ] Bot follows up adjacent to a hit on the very next turn
- [ ] After a sink, bot resumes checkerboard hunting
- [ ] Full game completes; win/lose and Play again unchanged

---

## Acceptance Criteria
- [ ] `huntTarget` replaces `randomShot` in the reducer
- [ ] Simulated average is well below random (target ~62–66, assert < 75)
- [ ] Bot still receives only `state.player.shots`
- [ ] All validation commands pass

## Completion Checklist
- [ ] Code matches `bot.ts` / `engine.ts` style (no semicolons, single quotes, short comments)
- [ ] Errors follow `fnName: reason`
- [ ] Tests seeded and deterministic
- [ ] CLAUDE.md + PRD updated
- [ ] No GameState / UI changes

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Medium bot too strong for casual players | M | M | PRD playtest metric; `randomShot` stays available as Easy |
| Existing reducer tests pin bot cells | M | L | Task 2 GOTCHA: update only bot-cell expectations |
| Simulated test slow | L | L | 300 games × ≤100 shots × O(100) per shot is about 3M ops, well under 1s |
| Row-wrap bug in neighbour math | M | H | `step` helper plus the A10 edge test |

## Notes
- Confidence: 9/10. It's one pure function plus a one-line call-site swap, and the shots map already encodes all the state the bot needs.
- Parity 2 matches the smallest ship (the destroyer, length 2), which stays the floor because sunk ships aren't identified by type in the shots map.
- Implement on a new branch off `main` (e.g. `feat/medium-bot`). Phase 1 and 3 are merged via PR #1.
