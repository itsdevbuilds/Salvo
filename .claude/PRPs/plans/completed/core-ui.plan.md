---
type: plan
status: complete
tags: [salvo, battleship, react, ui, useReducer, pointer-events, phase-3]
relatedTo: [salvo, salvo-battleship-prd, scaffold-and-engine-plan]
---

# Plan: Core UI

## Summary
Make Salvo playable end to end in the browser: a placement screen (drag, tap, rotate, randomize), a battle screen with two 10×10 grids, turn handling against a stand-in random bot, a win/lose message and "Play again". Game flow lives in a pure, tested reducer in `src/game/`; React components only render state and dispatch actions.

## User Story
As a casual player, I want to open the page, place my fleet and fire at the bot until someone wins, so that I can play a full game of Battleship with no sign-up.

## Problem → Solution
Page shows a placeholder `<h1>Salvo</h1>` → full game loop: placing → playing → over → play again.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/salvo-battleship.prd.md`
- **PRD Phase**: 3 — Core UI (runs in parallel with Phase 2, Medium bot)
- **Estimated Files**: 11 (6 create, 5 update)

---

## UX Design

### Before
```
┌──────────────────────┐
│ Salvo                │   (nothing to do)
└──────────────────────┘
```

### After
```
PLACING                                    PLAYING / OVER
┌───────────────────────────────────┐      ┌──────────────────────────────────────┐
│ Salvo                             │      │ Salvo                                │
│ Place your fleet.                 │      │ You hit at B4! Bot missed at J10.    │
│ [carrier■■■■■] [battleship■■■■]   │      │  Your fleet          Enemy waters    │
│ [cruiser■■■] [submarine■■■] ...   │      │  ┌──────────┐       ┌──────────┐     │
│ [Rotate ↻] [Randomize] [Start]    │      │  │ ships +  │       │ your     │     │
│  ┌──────────┐                     │      │  │ bot hits │       │ shots    │     │
│  │ 10×10    │ ← drag/tap here,    │      │  └──────────┘       └──────────┘     │
│  │ preview  │   green ok / red bad│      │ (over: message + [Play again],       │
│  └──────────┘                     │      │  enemy ships revealed)               │
└───────────────────────────────────┘      └──────────────────────────────────────┘
```
Desktop: boards side by side. Narrow screens: boards wrap and stack (flex-wrap). Phase 4 makes the final mobile-layout decision.

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Tray ship | n/a | Tap selects; press and drag onto the grid places | Pointer events: mouse and touch |
| Own grid, placing | n/a | Hover/drag shows preview; tap an empty cell places the selected ship; press a placed ship to pick it up and drag it | Ship head (origin) goes under the pointer |
| Rotate | n/a | Toggles h/v for the selected ship | Applies on the next place |
| Randomize | n/a | Instantly places a full valid fleet | Fastest path to the first shot (PRD metric < 30s) |
| Start | n/a | Enabled once all 5 ships are placed | Bot fleet generated here |
| Enemy grid | n/a | Click/tap/Enter on an unshot cell fires; the bot replies immediately | Shot cells disabled |
| Game over | n/a | Message + Play again | Enemy ships revealed |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/game/engine.ts` | all (81) | Every engine function the reducer uses; guard-then-call convention |
| P0 | `src/game/types.ts` | all (19) | `Board`, `Cell`, `FLEET`, `ShotResult` |
| P1 | `src/game/engine.test.ts` | 1-25 | Test style, `seeded` rng (to be moved), `withDestroyer` helper |
| P1 | `src/main.tsx` | all | StrictMode root; `index.css` imported here |
| P1 | `CLAUDE.md` | Architecture | Conventions; bot isolation rule |
| P2 | `src/index.css` | all (111) | Vite template leftovers to replace (code-review finding) |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Pointer events | https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events | One API for mouse, touch and pen |
| Implicit pointer capture | https://w3c.github.io/pointerevents/#implicit-pointer-capture | Touch pointers are captured by the pressed element, so `pointermove` keeps firing on it (and bubbles to ancestors) and `pointerenter` on other cells does NOT fire. Find the cell under the finger with `document.elementFromPoint(x, y)` |
| `touch-action` | https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action | `touch-action: none` on draggable areas, or the browser scrolls instead of sending pointermove |
| useReducer | https://react.dev/reference/react/useReducer | StrictMode calls reducers twice in dev; reducer must not mutate. Init: `useReducer(reducer, undefined, initialState)` |

KEY_INSIGHT: `@dnd-kit/core` 6.3.1 was last published 2024-12; its successor `@dnd-kit/react` is 0.5.1 (pre-1.0).
APPLIES_TO: Placement drag.
GOTCHA: Neither is a good bet. Snapping a ship to a 10×10 grid needs only pointer events + `elementFromPoint` (~25 lines), with zero dependencies. **Deviation from PRD decision "@dnd-kit/core + tap fallback"**: Task 9 records it in the PRD decisions log.

KEY_INSIGHT: On touch, `click` after a drag fires on the common ancestor of the down/up targets, not on the drop cell.
APPLIES_TO: Own grid during placing.
GOTCHA: Drive the own grid with `onPointerDown`/`onPointerUp` only, no `onClick`. The enemy grid uses plain `onClick` (no dragging), which also gives keyboard support for free.

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: src/game/engine.ts:14-20
```ts
export const toCell = (row: number, col: number): Cell => row * BOARD_SIZE + col
export const rowOf = (cell: Cell) => Math.floor(cell / BOARD_SIZE)
export const emptyBoard = (): Board => ({ ships: [], shots: new Map() })
```
camelCase functions, arrow consts for one-liners, `function` for multi-line. Types are PascalCase `type` aliases (no `interface`). No semicolons, single quotes.

### ERROR_HANDLING
// SOURCE: src/game/engine.ts:64-66
```ts
if (!inRange(cell)) throw new Error(`fire: cell ${cell} out of range`)
if (isShot(board, cell)) throw new Error(`fire: cell ${cell} already shot`)
```
Engine throws on invalid calls, prefixed with the function name. **The reducer must never throw on user input**: guard with `isShot` / `shipCells` / `canPlace` / phase checks first, and return `state` unchanged for invalid actions (a misclick is expected, not a bug).

### RNG_INJECTION
// SOURCE: src/game/engine.ts:43
```ts
export function randomFleet(rng: () => number = Math.random): Ship[] {
```
Every random function takes `rng` with a `Math.random` default. Actions that need randomness carry an optional `rng`, so tests pass a seeded one and the UI passes nothing.

### IMMUTABILITY
// SOURCE: src/game/engine.ts:39, 67
```ts
return { ...board, ships: [...board.ships, { type, cells }] }
const shots = new Map(board.shots)
```

### LOGGING_PATTERN
None. No logging in the codebase; don't add any.

### TEST_STRUCTURE
// SOURCE: src/game/engine.test.ts:1-25, 93-96
```ts
import { describe, it, expect } from 'vitest'
...
describe('fire', () => {
  it('returns miss on empty water', () => {
    expect(fire(withDestroyer(), 50).result).toBe('miss')
  })
```
Co-located `*.test.ts`, explicit vitest imports, one `describe` per function or action, short `it` names in plain English.

### COMPONENT_STYLE
// SOURCE: src/App.tsx (Vite template style) + src/main.tsx
```tsx
export default function App() {
  return <h1>Salvo</h1>
}
```
Function components, default export for `App`, named export for others. Import types with `import { type X }` (`verbatimModuleSyntax`). Write `import App from './App.tsx'` with the extension, as main.tsx does (`allowImportingTsExtensions`); `.ts` imports inside `src/game/` omit the extension, as engine.test.ts does. Keep each file's existing style.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/game/test-utils.ts` | CREATE | Share `seeded` rng across 3 test files instead of copying it |
| `src/game/engine.ts` | UPDATE | Add `cellName` (A1–J10), used by messages and aria-labels |
| `src/game/engine.test.ts` | UPDATE | Import `seeded` from test-utils; test `cellName` |
| `src/game/bot.ts` | CREATE | Stand-in random bot; Phase 2 replaces its body |
| `src/game/bot.test.ts` | CREATE | Bot never repeats a shot |
| `src/game/reducer.ts` | CREATE | Pure game-flow state machine |
| `src/game/reducer.test.ts` | CREATE | Placement, start, fire, win/lose, reset, full game |
| `src/Grid.tsx` | CREATE | One 10×10 board renderer used for both boards |
| `src/App.tsx` | UPDATE | `useReducer`, placement tray/drag, controls, status |
| `src/index.css` | UPDATE | Replace Vite template CSS with game styles |
| `CLAUDE.md` | UPDATE | Document the reducer/UI split and bot stub |

(Plus the PRD decisions log in Task 9.)

## NOT Building

- Medium/hunt-target bot (Phase 2). `randomShot` is the stand-in.
- Delayed bot turn, animations, sound, theme and final mobile layout (Phase 4).
- Difficulty picker, Salvo variant, stats.
- Keyboard-only ship placement (Randomize is the keyboard path; full keyboard placement is Phase 4 a11y work).
- Component/DOM tests: no jsdom or testing-library dependency. Logic is covered by reducer tests; the UI is verified in the browser.
- Drag offset (grabbing a ship by its middle). The ship's head always goes under the pointer.

---

## Step-by-Step Tasks

### Task 1: Shared test rng
- **ACTION**: Move `seeded` out of `engine.test.ts` into `src/game/test-utils.ts` as a named export; import it in `engine.test.ts`.
- **IMPLEMENT**: Copy lines 15-23 of `engine.test.ts` verbatim with `export function seeded(seed: number)`.
- **MIRROR**: TEST_STRUCTURE.
- **IMPORTS**: `import { seeded } from './test-utils'`
- **GOTCHA**: The file is not `*.test.ts`, so vitest won't run it as a suite; tsc includes it (`include: ["src"]`), which is fine.
- **VALIDATE**: `npx vitest run src/game/engine.test.ts` gives 18 passing tests.

### Task 2: `cellName`
- **ACTION**: Add to `src/game/engine.ts` after `colOf`.
- **IMPLEMENT**:
  ```ts
  // 'A1'..'J10': row letter, 1-based column
  export const cellName = (cell: Cell) => `${String.fromCharCode(65 + rowOf(cell))}${colOf(cell) + 1}`
  ```
  Test: `cellName(0)` is `'A1'`, `cellName(toCell(1, 3))` is `'B4'`, `cellName(99)` is `'J10'`.
- **MIRROR**: NAMING_CONVENTION.
- **VALIDATE**: The new `describe('cellName')` passes.

### Task 3: Stand-in bot
- **ACTION**: Create `src/game/bot.ts`.
- **IMPLEMENT**:
  ```ts
  import { BOARD_SIZE, type Cell, type ShotResult } from './types'

  // stand-in until the Phase 2 hunt/target bot; sees only its own shot history, never the player's ships
  export function randomShot(shots: ReadonlyMap<Cell, ShotResult>, rng: () => number = Math.random): Cell {
    const open = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, c) => c).filter((c) => !shots.has(c))
    if (open.length === 0) throw new Error('randomShot: no cells left')
    return open[Math.floor(rng() * open.length)]
  }
  ```
  Test (`bot.test.ts`): starting from an empty Map, draw 100 times with `seeded(1)`, adding each result as `'miss'`. All 100 results are unique and 0–99, and a 101st call throws.
- **MIRROR**: RNG_INJECTION, ERROR_HANDLING.
- **GOTCHA**: The signature takes `shots`, not `Board`. That is the bot-isolation rule from CLAUDE.md, so don't widen it.
- **VALIDATE**: `npx vitest run src/game/bot.test.ts`

### Task 4: Game reducer
- **ACTION**: Create `src/game/reducer.ts`.
- **IMPLEMENT**:
  ```ts
  import { randomShot } from './bot'
  import { allSunk, canPlace, cellName, emptyBoard, fire, isShot, randomFleet, shipCells, type FireOutcome } from './engine'
  import { FLEET, type Board, type Cell, type Orientation, type ShipType } from './types'

  export type Phase = 'placing' | 'playing' | 'over'

  export type GameState = {
    phase: Phase
    player: Board
    enemy: Board
    orientation: Orientation
    selected: ShipType | null
    winner: 'player' | 'bot' | null
    message: string
  }

  export type Action =
    | { type: 'select'; ship: ShipType }
    | { type: 'rotate' }
    | { type: 'place'; origin: Cell }
    | { type: 'randomize'; rng?: () => number }
    | { type: 'start'; rng?: () => number }
    | { type: 'fire'; cell: Cell; rng?: () => number }
    | { type: 'reset' }

  export const initialState = (): GameState => ({
    phase: 'placing',
    player: emptyBoard(),
    enemy: emptyBoard(),
    orientation: 'h',
    selected: FLEET[0].type,
    winner: null,
    message: 'Place your fleet.',
  })

  const nextUnplaced = (board: Board) =>
    FLEET.find((f) => !board.ships.some((s) => s.type === f.type))?.type ?? null

  // cells the selected ship would occupy at origin, or null if off-board/overlapping (ignores its own current spot)
  export function placementCells(state: GameState, origin: Cell): Cell[] | null {
    if (!state.selected) return null
    const length = FLEET.find((f) => f.type === state.selected)!.length
    const cells = shipCells(origin, length, state.orientation)
    const others = state.player.ships.filter((s) => s.type !== state.selected)
    return cells && canPlace(others, cells) ? cells : null
  }

  function report(who: 'You' | 'Bot', cell: Cell, { result, sunk }: FireOutcome) {
    if (result === 'miss') return `${who} missed at ${cellName(cell)}.`
    if (result === 'hit') return `${who} hit at ${cellName(cell)}!`
    return `${who} sank ${who === 'You' ? 'their' : 'your'} ${sunk}!`
  }

  export function gameReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
      case 'select':
        return state.phase === 'placing' ? { ...state, selected: action.ship } : state
      case 'rotate':
        return state.phase === 'placing' ? { ...state, orientation: state.orientation === 'h' ? 'v' : 'h' } : state
      case 'place': {
        const cells = state.phase === 'placing' ? placementCells(state, action.origin) : null
        if (!cells || !state.selected) return state
        const ships = [...state.player.ships.filter((s) => s.type !== state.selected), { type: state.selected, cells }]
        const player = { ...state.player, ships }
        return { ...state, player, selected: nextUnplaced(player) }
      }
      case 'randomize':
        if (state.phase !== 'placing') return state
        return { ...state, player: { ships: randomFleet(action.rng), shots: new Map() }, selected: null }
      case 'start':
        if (state.phase !== 'placing' || state.player.ships.length !== FLEET.length) return state
        return {
          ...state,
          phase: 'playing',
          enemy: { ships: randomFleet(action.rng), shots: new Map() },
          selected: null,
          message: 'Fire at the enemy grid.',
        }
      case 'fire': {
        if (state.phase !== 'playing' || isShot(state.enemy, action.cell)) return state
        const shot = fire(state.enemy, action.cell)
        if (allSunk(shot.board))
          return { ...state, enemy: shot.board, phase: 'over', winner: 'player', message: 'You sank their whole fleet. You win!' }
        const target = randomShot(state.player.shots, action.rng)
        const reply = fire(state.player, target)
        const lost = allSunk(reply.board)
        return {
          ...state,
          enemy: shot.board,
          player: reply.board,
          phase: lost ? 'over' : 'playing',
          winner: lost ? 'bot' : null,
          message: lost
            ? 'The bot sank your whole fleet. You lose.'
            : `${report('You', action.cell, shot)} ${report('Bot', target, reply)}`,
        }
      }
      case 'reset':
        return initialState()
    }
  }
  ```
- **MIRROR**: IMMUTABILITY, ERROR_HANDLING (guard, never throw), RNG_INJECTION.
- **IMPORTS**: as shown. `placementCells` is exported because App uses it for the drag preview (one source of truth for validity).
- **GOTCHA**:
  - Don't call `placeShip` for moves: it throws when that ship type is already placed. The reducer filters out the old copy and builds the new one itself.
  - The switch must be exhaustive with no `default`, so TS flags a missing case (`noFallthroughCasesInSwitch` is on; the return type forces every path to return).
  - `fire` with an out-of-range cell would throw. The UI only ever sends 0–99, so no extra guard.
  - StrictMode double-calls the reducer in dev with `Math.random`. One result is discarded and nothing is mutated, so this is safe.
- **VALIDATE**: `npx tsc -b`

### Task 5: Reducer tests
- **ACTION**: Create `src/game/reducer.test.ts`.
- **IMPLEMENT** (one `describe` per action group):
  - `initialState`: phase placing, carrier selected, no ships.
  - `place`: places the selected ship and auto-selects the next (`battleship`); an invalid origin (`toCell(0, 8)` carrier h) returns the **same object** (`toBe(state)`); re-selecting a placed ship and placing it elsewhere moves it (still 1 carrier, new cells); a placement overlapping another ship is ignored; after all 5, `selected` is null.
  - `rotate`: the next placement goes vertical (`[0, 10, 20, 30, 40]` for carrier at 0).
  - `start`: ignored with fewer than 5 ships; with a full fleet, phase becomes playing and the enemy has 5 ships.
  - `fire`: one shot adds exactly 1 enemy shot and 1 player shot; firing the same cell again returns the same state; ignored during placing.
  - full game: `randomize(seeded(1))` → `start(seeded(2))`, then fire cells 0,1,2… with one shared `seeded(3)` until phase is not playing. Expect phase `over`, winner non-null, and the bot's shot count equal to the player's turn count (or one less if the player won). This proves the bot never repeats a cell.
  - `reset`: returns to placing with empty boards.
- **MIRROR**: TEST_STRUCTURE. Use `seeded` from `./test-utils`.
- **VALIDATE**: `npm test`, all suites green.

### Task 6: Grid component
- **ACTION**: Create `src/Grid.tsx`.
- **IMPLEMENT**:
  ```tsx
  import { type PointerEvent } from 'react'
  import { cellName } from './game/engine'
  import { BOARD_SIZE, type Board, type Cell } from './game/types'

  type Props = {
    board: Board
    id: 'player' | 'enemy'
    label: string
    showShips: boolean
    preview?: { cells: readonly Cell[]; valid: boolean } | null
    onFire?: (cell: Cell) => void
    onCellDown?: (cell: Cell, e: PointerEvent<HTMLButtonElement>) => void
  }

  export function Grid({ board, id, label, showShips, preview, onFire, onCellDown }: Props) {
    const shipAt = new Set(board.ships.flatMap((s) => s.cells))
    return (
      <section className="board">
        <h2>{label}</h2>
        <div className={`grid grid-${id}`}>
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cell) => {
            const shot = board.shots.get(cell)
            const ship = showShips && shipAt.has(cell)
            const inPreview = preview?.cells.includes(cell)
            const classes = ['cell', ship && 'ship', shot, inPreview && (preview!.valid ? 'preview' : 'invalid')]
            return (
              <button
                key={cell}
                type="button"
                data-board={id}
                data-cell={cell}
                className={classes.filter(Boolean).join(' ')}
                aria-label={`${cellName(cell)}${shot ? `, ${shot}` : ship ? ', ship' : ''}`}
                disabled={onFire ? !!shot : !onCellDown}
                onClick={onFire && (() => onFire(cell))}
                onPointerDown={onCellDown && ((e) => onCellDown(cell, e))}
              />
            )
          })}
        </div>
      </section>
    )
  }
  ```
- **MIRROR**: COMPONENT_STYLE.
- **GOTCHA**:
  - Never put ship info in the enemy grid's DOM before the game is over (`showShips` false). Otherwise the ships are visible in devtools and aria-labels, which is cheating.
  - Disabled buttons swallow pointer events. The player grid during `playing` is display-only (disabled), which is intended.
  - React 19 types: import `PointerEvent` as a type from `react`, not the DOM global.
- **VALIDATE**: `npx tsc -b`

### Task 7: App wiring
- **ACTION**: Replace `src/App.tsx`.
- **IMPLEMENT** (structure; finish details in the same style):
  ```tsx
  import { useReducer, useState, type PointerEvent } from 'react'
  import { Grid } from './Grid.tsx'
  import { gameReducer, initialState, placementCells } from './game/reducer'
  import { FLEET, type Cell, type ShipType } from './game/types'

  // the player-grid cell under a screen point (works during touch drags, where the pressed element holds capture)
  function playerCellAt(x: number, y: number): Cell | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-board="player"]')
    return el ? Number(el.dataset.cell) : null
  }

  export default function App() {
    const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
    const [hover, setHover] = useState<Cell | null>(null)
    const [drag, setDrag] = useState<{ from: Cell | null } | null>(null)
    const placing = state.phase === 'placing'
    ...
  }
  ```
  Behaviour:
  - **Preview** (placing only): if `hover !== null && state.selected`, then `cells = placementCells(state, hover)`. Show `{ cells, valid: true }`, or `{ cells: [hover], valid: false }` when null.
  - **Wrapper `<main>`** handlers (placing only): `onPointerMove`: `setHover(playerCellAt(e.clientX, e.clientY))`. `onPointerUp`: if `drag`, find the cell under the pointer; if it is non-null and `!== drag.from`, `dispatch({ type: 'place', origin: cell })`; then `setDrag(null)`. `onPointerCancel`: `setDrag(null)`. `onPointerLeave`: `setHover(null)`.
  - **Tray**: for each `FLEET` entry not yet placed, a `<button className="tray-ship">` (`aria-pressed` = selected) showing the name and `length` small squares. `onPointerDown`: dispatch `select`, then `setDrag({ from: null })`. `onClick`: dispatch `select` (keyboard).
  - **Player grid `onCellDown`** (placing only): if a ship covers the cell, dispatch `select` for that ship and `setDrag({ from: cell })` (pick up). Otherwise dispatch `place` at that cell (tap to place).
  - **Controls** (placing): Rotate (`aria-pressed` vertical, label "Rotate (horizontal/vertical)"), Randomize (`dispatch({ type: 'randomize' })`), Start (disabled until `state.player.ships.length === FLEET.length`).
  - **Status**: `<p role="status">{state.message}</p>`.
  - **Boards**: placing shows only the player grid. Playing/over shows player (`showShips`) and enemy (`showShips={state.phase === 'over'}`, `onFire` only while playing).
  - **Over**: `<button onClick={() => dispatch({ type: 'reset' })}>Play again</button>`.
- **GOTCHA**:
  - The pressed button holds implicit capture on touch, so do hit-testing with `playerCellAt`, never with `pointerenter` per cell.
  - `from` stops a plain tap on a placed ship (down and up on the same cell) from moving the ship's head to the tapped cell.
  - The `onFire` handler is only passed while `phase === 'playing'`, so game-over boards are inert.
- **VALIDATE**: `npx tsc -b && npx oxlint`, then manual browser check (below).

### Task 8: Styles
- **ACTION**: Replace `src/index.css` entirely (removes the dead template CSS flagged by code review).
- **IMPLEMENT** (minimal, functional; visual theme is Phase 4):
  - `:root` tokens: `--bg`, `--fg`, `--water`, `--ship`, `--hit`, `--miss`, `--sunk`, `--ok`, `--bad`, `--line`, plus a `@media (prefers-color-scheme: dark)` override. `color-scheme: light dark`.
  - `body { margin: 0; font: 16px/1.4 system-ui, sans-serif; background: var(--bg); color: var(--fg) }`
  - `main { max-width: 900px; margin: 0 auto; padding: 16px }`; `.boards { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center }`
  - `.grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; width: min(92vw, 400px); aspect-ratio: 1; touch-action: none; user-select: none }`
  - `.cell { aspect-ratio: 1; border: 0; border-radius: 3px; background: var(--water); padding: 0 }` plus `.ship`, `.miss`, `.hit`, `.sunk`, `.preview`, `.invalid` backgrounds. Show a dot for miss via `::after` and an ✕ for hit via `content`. `.grid-enemy .cell:not(:disabled):hover { outline: 2px solid var(--fg) }`, `.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px }`.
  - `.tray-ship { touch-action: none }`, `[aria-pressed="true"] { outline: 2px solid var(--ok) }`.
- **GOTCHA**: `touch-action: none` must be on the grid **and** the tray buttons, or mobile scrolls instead of dragging. Keep min tap size: at 92vw/10 a cell is about 34px on a 375px phone. That's acceptable; Phase 4 tunes it.
- **VALIDATE**: `npm run build` and visual check.

### Task 9: Docs
- **ACTION**: Update `CLAUDE.md` Architecture with 2 bullets:
  - `src/game/reducer.ts`: the whole game flow (`placing → playing → over`) as a pure reducer. Randomness enters through optional `rng` on actions. Invalid actions return the same state (never throw). React (`App.tsx`, `Grid.tsx`) only renders and dispatches.
  - `src/game/bot.ts`: `randomShot` is a stand-in until the Phase 2 bot; it receives only the shots map.
  - Also add a row to the PRD Decisions Log: `Drag-and-drop | Native pointer events + elementFromPoint | @dnd-kit/core (stale since 2024-12), @dnd-kit/react (0.x) | No dependency; snapping to a 10×10 grid is ~25 lines`. Leave the original dnd-kit row in place, marked superseded.
- **VALIDATE**: Read back.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| cellName | 0, 13, 99 | A1, B4, J10 | corners |
| randomShot | 100 draws | 100 unique cells, then throws | exhaustion |
| place valid | carrier at 0 | carrier placed, battleship selected | |
| place off-board | carrier at A9 h | same state object | yes |
| place overlap | second ship over first | same state object | yes |
| move ship | select placed carrier, place at 50 | 1 carrier at new cells | yes |
| start incomplete | 4 ships | same state | yes |
| fire repeat | same cell twice | same state | yes |
| fire before start | placing phase | same state | yes |
| full game | seeded fleets, scan fire | phase over, bot shots unique | |
| reset | any state | initialState shape | |

### Edge Cases Checklist
- [x] Empty input: start with no ships ignored
- [x] Maximum: full game to completion, bot exhaustion throws (unreachable in play)
- [x] Invalid: off-board, overlap, repeat shot, wrong phase all return the same state
- [ ] Concurrent access: n/a (single-threaded; rapid double clicks are covered by the repeat-shot guard)
- [ ] Network: n/a (no network)
- [ ] Permission: n/a

---

## Validation Commands

### Static Analysis
```bash
npx tsc -b && npx oxlint
```
EXPECT: exit 0 for both.

### Unit Tests
```bash
npx vitest run src/game
```
EXPECT: all pass (18 existing + new).

### Full Test Suite / Build
```bash
npm test && npm run build
```
EXPECT: exit 0.

### Browser Validation
```bash
npm run dev   # http://localhost:5173 (may already be running)
```
Use the chrome-devtools MCP (`navigate_page`, `take_snapshot`, `click`, `take_screenshot`, `emulate` for a mobile viewport), or check manually.

### Manual Validation
- [ ] Randomize → Start → fire until game over → Play again works (desktop)
- [ ] Tap a tray ship, tap a cell: ship placed; tap an invalid cell: nothing happens
- [ ] Drag a tray ship onto the grid with the mouse: green preview, placed on release; red preview over an invalid spot, not placed
- [ ] Press a placed ship and drag it elsewhere: it moves; a plain tap on it only selects it
- [ ] Rotate flips the preview to vertical
- [ ] Shot enemy cells are disabled; the status line reports both shots
- [ ] Enemy ships are not in the DOM before game over (inspect aria-labels/classes)
- [ ] Mobile emulation (375×667): drag works without the page scrolling, and both boards fit stacked
- [ ] No console errors

---

## Acceptance Criteria
- [ ] All tasks completed
- [ ] tsc, oxlint, vitest, build all exit 0
- [ ] Full game playable on desktop and in mobile emulation (PRD Phase 3 success signal)
- [ ] Bot only receives the shots map

## Completion Checklist
- [ ] Code follows engine conventions (immutable, injected rng, guard-then-call)
- [ ] Reducer never throws on user input
- [ ] Tests co-located, explicit vitest imports
- [ ] No new runtime dependencies
- [ ] index.css template leftovers gone
- [ ] CLAUDE.md + PRD decision log updated

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Touch drag scrolls the page instead | M | H | `touch-action: none` on grid + tray; verify in mobile emulation |
| Dropped pointerup (finger leaves window) leaves drag stuck | L | L | `onPointerCancel` clears it; the next tap overrides it anyway |
| 34px cells too small on phones | M | M | Acceptable for Phase 3; Phase 4 layout decision (one board at a time) |
| Random bot too easy | H | L | Expected; Phase 2 replaces `randomShot` |

## Notes
- Phase 3 was chosen over Phase 2 (both eligible) so the game becomes playable first. Phase 2 only swaps the body of `bot.ts`, plus the bot's own state if hunt/target needs more than the shots map. It can derive targets from unsunk `'hit'` cells, so the signature likely holds.
- The bot replies instantly in the same dispatch. A turn delay or animation is Phase 4.
