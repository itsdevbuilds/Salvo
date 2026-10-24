---
type: plan
status: complete
tags: [salvo, battleship, mobile, responsive, animation, theme, neon-radar, phase-4]
relatedTo: [salvo, salvo-battleship-prd, core-ui-plan, medium-bot-plan]
---

# Plan: Mobile + Polish (neon radar, enemy-first layout, paced bot)

## Summary
Make the battle screen work on a phone without scrolling: the enemy grid sits big on top, and your fleet is a minimap beside the status line. Add a "neon radar" theme, CSS-only hit/miss/sunk animations and a marker on the last shot on each board. The bot now replies about 600 ms after your shot instead of in the same click. To do that, the reducer's `fire` action is split into `fire` (your shot) and `botFire` (the bot's reply).

## User Story
As a casual player on a phone, I want to see the enemy grid and my own fleet at once, and to see each shot land, so that a quick game feels responsive and readable without scrolling or guessing what the bot did.

## Problem → Solution
- **Now:** on a phone, your grid sits on top and the enemy grid below it. You scroll down to fire and back up to see the bot's shot. That shot lands in the same click with no feedback, and the look is a plain flat style.
- **After:** the enemy grid is on top and sized to the viewport height. Your fleet minimap and the status line share a row beneath it.
  - Your shot animates.
  - The bot "thinks" for 600 ms, then its shot animates and is marked on the minimap.
  - The theme is dark-first neon radar, with a sweep over the enemy grid.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/salvo-battleship.prd.md`
- **PRD Phase**: Phase 4, Mobile + polish
- **Estimated Files**: 8 (reducer, reducer test, App, Grid, index.css, index.html, CLAUDE.md, PRD)
- **Branch**: `feat/mobile-polish` (already created from `main` at 4503237, after PR #2 was merged)

### Decisions (user, 2026-10-24)
| Question | Choice |
|---|---|
| Phone battle layout (PRD open question) | Enemy grid big on top, with your fleet as a minimap beside the status line |
| Visual direction (PRD open question) | Neon radar, dark-first, with light mode kept readable |
| Bot pacing | About 600 ms delay, using a separate `botFire` action |

---

## UX Design

### Before (375×667, battle)
```
┌───────────────────┐
│ Salvo             │
│ You hit B4! Bot…  │
│ Your fleet        │
│ ┌───────────────┐ │
│ │  PLAYER 10x10 │ │
│ └───────────────┘ │
│ Enemy waters      │   ← below the fold: scroll to fire,
│ ┌───────────────┐ │     scroll back to see the bot's shot
│ │  ENEMY 10x10  │ │
```

### After (375×667, battle)
```
┌───────────────────┐
│ Enemy waters      │   (h1 visually hidden on phones in battle)
│ ┌───────────────┐ │
│ │ ENEMY 10x10   │ │   radar sweep, cells flash on hit/ping on miss
│ │ (tap = fire)  │ │   width = min(92vw, 400px, 100dvh - 230px)
│ └───────────────┘ │
│ Your fleet        │
│ ┌──────┐ You hit  │
│ │ mini │ at B4!   │   minimap ≈150px; bot's last shot outlined
│ │      │ Bot miss…│
│ └──────┘          │
└───────────────────┘
```
Desktop (≥720px): the enemy grid is on the left, and the hud column on the right holds your full-size grid with the status line under it. Placement is unchanged apart from the theme, and its status line now sits just above your grid.

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Fire | Your shot and the bot's shot resolve in one click | Your shot resolves; the enemy grid locks for about 600 ms; then the bot fires | Enemy cells are `disabled` while it's the bot's turn |
| Shot feedback | Static colour | Miss: sonar ping. Hit: flare. Sunk: pulse on the whole ship. The last shot on each board is outlined | Pure CSS; triggered when a class is added |
| Rapid taps on enemy grid | iOS may double-tap-zoom | `touch-action: manipulation` on `.grid` | `.grid-drag` keeps `none` while placing |
| Game over | Plain status text | Status coloured by winner (`data-winner` on `<main>`) | Play again button unchanged |
| Reduced motion | n/a | All animations off | `prefers-reduced-motion: reduce`; the bot delay stays |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/game/reducer.ts` | 18-127 | `GameState`, `Action`, `report`, and the `fire` case being split |
| P0 | `src/game/reducer.test.ts` | 1-12, 107-146 | `run`/`playing` helpers; the fire, full-game and reset tests that must change |
| P0 | `src/App.tsx` | 20-146 | Layout JSX being restructured; drag relies on `[data-board="player"]` |
| P0 | `src/index.css` | 1-181 | Full stylesheet being re-themed; tokens on `:root` with a dark override |
| P1 | `src/Grid.tsx` | 1-49 | Cell classes; the `disabled` rule; the enemy-ships privacy comment |
| P1 | `src/game/engine.ts` | 68-83 | `fire` uses `new Map(...)` then `set` — the new cell is always the **last key**, even on a sink |
| P2 | `CLAUDE.md` | Architecture | Doc bullets to update |

## External Documentation
No external research needed. The feature uses established CSS and React features with broad support:
- `dvh` units: Safari 15.4+, Chrome 108+, Firefox 101+.
- `conic-gradient`, `prefers-reduced-motion`, `touch-action: manipulation`: all widely supported.

GOTCHA: write the plain `width: min(92vw, 400px)` first and the `dvh` version second, so older engines drop the invalid second declaration and keep the first.

---

## Patterns to Mirror

### NAMING_CONVENTION / STYLE
```ts
// SOURCE: src/game/reducer.ts:18-37 — union types, action objects with optional injected rng
export type Phase = 'placing' | 'playing' | 'over'
export type Action =
  | { type: 'select'; ship: ShipType }
  | { type: 'fire'; cell: Cell; rng?: () => number }
```
No semicolons, single quotes, `import { type X }`, short lower-case `//` comments that explain *why*.

### ERROR_HANDLING (reducer: never throw on user input)
```ts
// SOURCE: src/game/reducer.ts:66, 105-106
// invalid actions (misclicks, wrong phase) return the same state; never throws on user input
case 'fire': {
  if (state.phase !== 'playing' || !inRange(action.cell) || isShot(state.enemy, action.cell)) return state
```

### LOGGING_PATTERN
None. The codebase has no logging; user-facing feedback goes through `state.message` (rendered as `role="status"`).

### STATE / DATA FLOW
```ts
// SOURCE: src/game/reducer.ts:105-122 — current fire case (to be split)
const shot = fire(state.enemy, action.cell)
if (allSunk(shot.board))
  return { ...state, enemy: shot.board, phase: 'over', winner: 'player', message: 'You sank their whole fleet. You win!' }
const target = huntTarget(state.player.shots, action.rng)
const reply = fire(state.player, target)
const lost = allSunk(reply.board)
return { ...state, enemy: shot.board, player: reply.board, phase: lost ? 'over' : 'playing', winner: lost ? 'bot' : null,
  message: lost ? 'The bot sank your whole fleet. You lose.' : `${report('You', action.cell, shot)} ${report('Bot', target, reply)}` }
```

### UI PATTERN (render + dispatch only)
```tsx
// SOURCE: src/App.tsx:126-134
{!placing && (
  <Grid board={state.enemy} id="enemy" label="Enemy waters" showShips={state.phase === 'over'}
    onFire={state.phase === 'playing' ? (cell) => dispatch({ type: 'fire', cell }) : undefined} />
)}
```
```tsx
// SOURCE: src/Grid.tsx:30, 39 — classes array + disabled rule (onFire undefined => every cell disabled)
const classes = ['cell', ship && 'ship', shot, inPreview && (preview!.valid ? 'preview' : 'invalid')]
disabled={onFire ? !!shot : !onCellDown}
```

### CSS TOKENS
```css
/* SOURCE: src/index.css:1-34 — tokens on :root, dark override under prefers-color-scheme */
:root { --bg: #f6f8fb; --fg: #14202e; ... color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg: #0e1620; ... } }
```

### TEST_STRUCTURE
```ts
// SOURCE: src/game/reducer.test.ts:6-12, 108-113
const run = (state: GameState, ...actions: Action[]) => actions.reduce(gameReducer, state)
const playing = () => run(placedFleet(), { type: 'start', rng: seeded(2) })
it('records one shot each for player and bot', () => {
  const state = run(playing(), { type: 'fire', cell: 99, rng: seeded(3) })
  expect(state.enemy.shots.size).toBe(1)
```
Explicit `vitest` imports, `describe` per action, a `toBe(state)` identity check for ignored actions.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/game/reducer.ts` | UPDATE | Add `turn`; split `fire` into `fire` and `botFire`; move `rng` to `botFire` |
| `src/game/reducer.test.ts` | UPDATE | Turn-split tests; drop `rng` from `fire`; full-game loop dispatches both actions |
| `src/App.tsx` | UPDATE | Bot-delay effect; enemy-first layout with a `.hud` wrapper; `placing`/`battle` class and `data-winner` on `<main>` |
| `src/Grid.tsx` | UPDATE | `last` class on the most recent shot |
| `src/index.css` | UPDATE (rewrite) | Neon radar tokens, phone battle layout, animations, sweep, reduced motion, touch fixes |
| `index.html` | UPDATE | `theme-color` meta for light and dark |
| `CLAUDE.md` | UPDATE | Reducer bullet (turn/botFire); a UI note on the layout and the animation trigger |
| `.claude/PRPs/prds/salvo-battleship.prd.md` | UPDATE (done at plan time) | Phase 4 in-progress with link; open questions resolved; decisions log |

## NOT Building
- Sound effects (PRD "Should"; separate work)
- An Easy/Hard difficulty picker (`randomShot` exists, but no UI for it)
- Framer Motion or any animation library (CSS is enough, per the PRD)
- Web fonts (use `ui-monospace` system stack; protects the Lighthouse ≥ 90 target)
- A landscape-phone layout (portrait-first; landscape gets the stacked phone layout with a smaller enemy grid; see Risks)
- A ships-left counter, haptics (`navigator.vibrate`), PWA, the Salvo variant, local stats
- Any change to placement interaction logic (theme only)
- A real-device test pass (that's Phase 5 playtest; this phase covers emulation plus an optional LAN check)

---

## Step-by-Step Tasks

### Task 1: Split the turn in the reducer
- **ACTION**: Update `src/game/reducer.ts`.
- **IMPLEMENT**:
  ```ts
  export type GameState = {
    phase: Phase
    player: Board
    enemy: Board
    orientation: Orientation
    selected: ShipType | null
    // whose shot is next while playing; the UI dispatches botFire after a delay
    turn: 'player' | 'bot'
    winner: 'player' | 'bot' | null
    message: string
  }

  export type Action =
    | { type: 'select'; ship: ShipType }
    | { type: 'rotate' }
    | { type: 'place'; origin: Cell }
    | { type: 'randomize'; rng?: () => number }
    | { type: 'start'; rng?: () => number }
    | { type: 'fire'; cell: Cell }
    | { type: 'botFire'; rng?: () => number }
    | { type: 'reset' }

  // initialState(): add  turn: 'player',

  case 'fire': {
    if (state.phase !== 'playing' || state.turn !== 'player' || !inRange(action.cell) || isShot(state.enemy, action.cell))
      return state
    const shot = fire(state.enemy, action.cell)
    if (allSunk(shot.board))
      return { ...state, enemy: shot.board, phase: 'over', winner: 'player', message: 'You sank their whole fleet. You win!' }
    return { ...state, enemy: shot.board, turn: 'bot', message: report('You', action.cell, shot) }
  }
  // the bot replies in its own action so the UI can pause before it; message still holds the player's report
  case 'botFire': {
    if (state.phase !== 'playing' || state.turn !== 'bot') return state
    const target = huntTarget(state.player.shots, action.rng)
    const reply = fire(state.player, target)
    if (allSunk(reply.board))
      return { ...state, player: reply.board, phase: 'over', winner: 'bot', message: 'The bot sank your whole fleet. You lose.' }
    return { ...state, player: reply.board, turn: 'player', message: `${state.message} ${report('Bot', target, reply)}` }
  }
  ```
  `start` needs no change, because `turn` is already `'player'` from `initialState` and `reset` returns `initialState()`.
- **MIRROR**: ERROR_HANDLING (guard first, then return the same state), STATE / DATA FLOW.
- **IMPORTS**: unchanged (`huntTarget`, `fire`, `allSunk`, `inRange`, `isShot` are already imported).
- **GOTCHA**:
  - A `fire` that wins must **not** hand the turn to the bot. The early return keeps `turn: 'player'`, and `phase: 'over'` blocks `botFire` anyway.
  - After a loss, `turn` stays `'bot'`. That's harmless because `phase` is `'over'`.
- **VALIDATE**: `npx tsc -b` will flag `reducer.test.ts`, whose `fire` actions still pass `rng` (excess property). That's fixed in Task 2.

### Task 2: Reducer tests
- **ACTION**: Update `src/game/reducer.test.ts`.
- **IMPLEMENT**:
  - Remove `rng` from every `{ type: 'fire', ... }`: lines 109, 121, 133, 143.
  - Replace `'records one shot each for player and bot'` with:
    ```ts
    it('takes the player shot and hands the turn to the bot', () => {
      const state = run(playing(), { type: 'fire', cell: 99 })
      expect(state.enemy.shots.size).toBe(1)
      expect(state.player.shots.size).toBe(0)
      expect(state.turn).toBe('bot')
      expect(state.message).toMatch(/^You /)
    })

    it('ignores the player while it is the bot turn', () => {
      const state = run(playing(), { type: 'fire', cell: 99 })
      expect(gameReducer(state, { type: 'fire', cell: 98 })).toBe(state)
    })
    ```
  - The `'ignores a repeat shot'` test must fire, botFire, then repeat, so the guard under test is the repeat, not the turn:
    `run(playing(), { type: 'fire', cell: 99 }, { type: 'botFire', rng: seeded(3) })`.
  - Add `describe('botFire', ...)`:
    ```ts
    it('fires back and returns the turn to the player', () => {
      const state = run(playing(), { type: 'fire', cell: 99 }, { type: 'botFire', rng: seeded(3) })
      expect(state.player.shots.size).toBe(1)
      expect(state.turn).toBe('player')
      expect(state.message).toMatch(/^You .* Bot /)
    })

    it('is ignored on the player turn and before the game starts', () => {
      for (const state of [playing(), placedFleet()]) expect(gameReducer(state, { type: 'botFire' })).toBe(state)
    })
    ```
  - Full-game loop (line 133): `for (let cell = 0; state.phase === 'playing'; cell++) state = run(state, { type: 'fire', cell }, { type: 'botFire', rng })`. A `botFire` after a player win is ignored, so the `turns - 1` assertion still holds.
  - Reset (line 143): `run(playing(), { type: 'fire', cell: 0 }, { type: 'botFire', rng: seeded(3) }, { type: 'reset' })`.
- **MIRROR**: TEST_STRUCTURE.
- **IMPORTS**: unchanged.
- **GOTCHA**: `toEqual(initialState())` in reset now also compares `turn`. That's fine, because both are `'player'`.
- **VALIDATE**: `npx vitest run src/game/reducer.test.ts` passes, and `npx tsc -b` is clean.

### Task 3: Bot delay and layout in App
- **ACTION**: Update `src/App.tsx`.
- **IMPLEMENT**:
  ```tsx
  import { useEffect, useReducer, useState, type PointerEvent } from 'react'
  // ...
  // long enough to see your shot land before the bot answers
  const BOT_DELAY_MS = 600

  // inside App, after useReducer:
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'bot') return
    const id = setTimeout(() => dispatch({ type: 'botFire' }), BOT_DELAY_MS)
    return () => clearTimeout(id)
  }, [state.phase, state.turn])
  ```
  JSX restructure:
  - Keep the `h1`.
  - **Move** `<p role="status">` out from under `h1` into `.hud`.
  - Put the enemy grid first.
  ```tsx
  <main className={placing ? 'placing' : 'battle'} data-winner={state.winner ?? undefined} /* existing pointer handlers */>
    <h1>Salvo</h1>
    {placing && (<>{/* hint, tray, controls: unchanged */}</>)}
    <div className="boards">
      {!placing && (
        <Grid board={state.enemy} id="enemy" label="Enemy waters" showShips={state.phase === 'over'}
          onFire={state.phase === 'playing' && state.turn === 'player' ? (cell) => dispatch({ type: 'fire', cell }) : undefined} />
      )}
      <div className="hud">
        <Grid board={state.player} id="player" label="Your fleet" showShips preview={preview}
          onCellDown={placing ? onCellDown : undefined} />
        <p role="status">{state.message}</p>
      </div>
    </div>
    {state.phase === 'over' && (/* Play again controls: unchanged */)}
  </main>
  ```
- **MIRROR**: UI PATTERN. `App` only renders and dispatches. The delay lives here, not in the reducer, which stays pure.
- **IMPORTS**: add `useEffect` from `react`.
- **GOTCHA**:
  - StrictMode mounts effects twice in dev. Cleanup clears the first timer; even if two `botFire`s fired, the reducer's turn guard ignores the second.
  - `reset` during the delay: the phase changes, cleanup clears the timer, and any stray `botFire` is ignored.
  - The status `<p>` must be rendered in **one** JSX spot for both phases, so the live region never remounts (a remounted `role="status"` can drop announcements). Phase-specific placement is done in CSS (Task 5).
  - Drag still works: `playerCellAt` finds `[data-board="player"]` wherever the grid sits.
- **VALIDATE**: `npx tsc -b`, `npm run lint`.

### Task 4: Last-shot marker in Grid
- **ACTION**: Update `src/Grid.tsx`.
- **IMPLEMENT**:
  ```tsx
  // Map keeps insertion order and fire() only appends the new cell, so the last key is the latest shot
  const last = [...board.shots.keys()].at(-1)
  // ...
  const classes = ['cell', ship && 'ship', shot, cell === last && 'last', inPreview && (preview!.valid ? 'preview' : 'invalid')]
  ```
- **MIRROR**: UI PATTERN (classes array).
- **IMPORTS**: none (ES2023 lib has `Array.prototype.at`).
- **GOTCHA**: Don't change the `showShips` privacy logic or the `disabled` rule. While it's the bot's turn, `onFire` is `undefined`, so every enemy cell is disabled. That's intended.
- **VALIDATE**: `npx tsc -b`.

### Task 5: Neon radar stylesheet
- **ACTION**: Rewrite `src/index.css`. Keep every existing selector's *function*: `.tray`, `.controls`, `.tray-ship` (with `touch-action: none`), `.grid-drag`, `.cell` states, `[aria-pressed='true']`, `button.primary`, and focus-visible.
- **IMPLEMENT** (values may be tuned; the structure is required):
  ```css
  :root {
    /* light: pale chart, teal accents */
    --bg: #eef5fa; --panel: #ffffff; --fg: #0b2233; --muted: #4f6b80; --line: #b9cfdd;
    --water: #d3e7f2; --accent: #007f99; --glow: transparent; --sweep: rgba(0, 127, 153, 0.18);
    --ship: #5a7d93; --miss: #3d8fb0; --hit: #e8631a; --sunk: #c21d3a; --flash: #ffd9b8;
    --ok: #0f8a5f; --on-ok: #fff; --bad: #d64545;
    color-scheme: light dark;
    font: 15px/1.4 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #050b14; --panel: #0a1626; --fg: #d8f3ff; --muted: #6f8ba3; --line: #12324a;
      --water: #071c2e; --accent: #22e3ff; --glow: rgba(34, 227, 255, 0.25); --sweep: rgba(34, 227, 255, 0.22);
      --ship: #2f5d7a; --miss: #3aa7c4; --hit: #ff7a1a; --sunk: #ff2e4d; --flash: #fff3e0;
      --ok: #2bff9a; --on-ok: #04140c; --bad: #ff4d6d;
    }
  }
  h1 { text-transform: uppercase; letter-spacing: 0.3em; color: var(--accent); text-shadow: 0 0 12px var(--glow); }
  h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); }
  button { -webkit-tap-highlight-color: transparent; }

  .boards { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; align-items: flex-start; }
  .hud { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .placing .hud [role='status'] { order: -1; }          /* status above your grid while placing */

  .grid {
    display: grid; gap: 2px; width: min(92vw, 400px); aspect-ratio: 1; user-select: none;
    background: var(--line); border: 1px solid var(--accent); border-radius: 6px; padding: 2px;
    box-shadow: 0 0 24px var(--glow);
    touch-action: manipulation;                          /* no double-tap zoom on rapid shots */
  }
  .grid-drag { touch-action: none; }                     /* must come after .grid */
  .grid-enemy {
    width: min(92vw, 400px);
    width: min(92vw, 400px, calc(100dvh - 230px));       /* fit enemy + minimap row on a phone screen */
    position: relative; overflow: hidden;
  }
  /* radar sweep: decorative, never intercepts taps */
  .grid-enemy::before {
    content: ''; position: absolute; inset: -50%; z-index: 1; pointer-events: none;
    background: conic-gradient(from 0deg, transparent 0 75%, var(--sweep));
    animation: sweep 4s linear infinite;
  }
  @keyframes sweep { to { transform: rotate(1turn); } }

  .cell.miss::after { /* existing dot */ animation: ping 500ms ease-out; }
  @keyframes ping { from { box-shadow: 0 0 0 0 var(--miss); } to { box-shadow: 0 0 0 12px transparent; } }
  .cell.hit { background: var(--hit); animation: flare 400ms ease-out; }
  @keyframes flare { from { background: var(--flash); box-shadow: 0 0 16px var(--hit); } }
  .cell.sunk { background: var(--sunk); animation: sink 700ms ease-out; }
  @keyframes sink { 0%, 40% { filter: brightness(1.8); box-shadow: 0 0 12px var(--sunk); } }
  .cell.last { outline: 2px solid var(--accent); outline-offset: -2px; }

  [data-winner='player'] [role='status'] { color: var(--ok); font-weight: 700; }
  [data-winner='bot'] [role='status'] { color: var(--hit); font-weight: 700; }

  @media (max-width: 719px) {
    main { padding: 8px 12px; }
    /* game screen: drop the title visually, keep it for screen readers */
    .battle h1 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .battle .boards { gap: 12px; }
    .battle .hud { flex-direction: row; align-items: center; gap: 12px; width: min(92vw, 400px); }
    .battle .grid-player { width: min(38vw, 150px); gap: 1px; padding: 1px; }
    .battle .hud [role='status'] { flex: 1; text-align: left; margin: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; }
  }
  ```
- **MIRROR**: CSS TOKENS (tokens on `:root`, dark override). The existing `.cell:disabled { opacity: 1 }` must stay.
- **GOTCHA**:
  - Animations fire when the class is **added** to the persistent `<button>` (stable `key={cell}`), so no JS is needed. Hit → sunk swaps the animation name, so the whole ship pulses once.
  - **Do not** use `transform: scale` in cell animations: `.grid-enemy` has `overflow: hidden` (needed to clip the sweep), so edge cells would be clipped.
  - The sweep pseudo-element must have `pointer-events: none`. `document.elementFromPoint` respects it, and placement only hit-tests the player grid anyway.
  - The `230px` constant is the vertical budget for the label, minimap row and padding. Tune it in Task 7 so nothing scrolls at 375×667 and 360×640.
- **VALIDATE**: `npm run build`; then visual check in Task 7.

### Task 6: index.html theme colour and docs
- **ACTION**:
  - In `index.html`, add these to `<head>`:
    ```html
    <meta name="theme-color" content="#eef5fa" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#050b14" media="(prefers-color-scheme: dark)" />
    ```
  - In `CLAUDE.md`, append to the reducer bullet: "While playing, `turn` alternates: `fire` takes the player's shot and hands over to the bot; `App` dispatches `botFire` after `BOT_DELAY_MS`, so the reducer stays synchronous and pure."
  - Add a UI bullet: "Battle layout: enemy grid first; your grid and the status line share `.hud` (a single `role=status` element for both phases, repositioned with CSS). Shot animations are CSS keyframes triggered when a cell gains its `miss`/`hit`/`sunk` class; `last` marks the newest shot (last key of the shots `Map`)."
- **VALIDATE**: `npm run build`.

### Task 7: Browser validation and tuning
- **ACTION**: The dev server is already running in the background (`npm run dev`, task `buoiellsg`). Reuse it; start it only if it's dead. Then use chrome-devtools.
  1. Emulate 375×667 (mobile, touch). Randomize, then Start.
     - Assert `document.documentElement.scrollHeight <= innerHeight`.
     - Assert the enemy grid and the minimap are both inside the viewport.
     - Tune `230px` if not.
  2. Repeat at 360×640 and at desktop 1280×800 (side-by-side layout).
  3. Click an enemy cell.
     - Immediately: `player.shots` unchanged. Check via the DOM: no new `.cell.last` on the player grid, and enemy cells disabled.
     - After about 700 ms: the bot's shot appears with `.last` on the minimap, and enemy cells are enabled again.
  4. `getComputedStyle(cell).animationName` on a fresh hit/miss is `flare` or `ping` (for miss, check `::after`).
  5. Play to the end. The status is coloured; Play again resets; no console errors.
  6. Placement still works at 375×667: drag a tray ship onto the grid, and drag a placed ship to move it.
  7. Light mode: emulate `prefers-color-scheme: light` and check it's readable. Reduced motion: emulate `prefers-reduced-motion: reduce` and check `animationName` is `none`.
- **VALIDATE**: All seven checks pass. Record the numbers in the report.

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| fire hands over the turn | playing, fire 99 | enemy shots 1, player shots 0, turn `bot`, message `^You ` | |
| fire ignored on bot turn | after fire 99, fire 98 | same state (`toBe`) | yes |
| repeat shot ignored | fire 99, botFire, fire 99 | same state | yes |
| fire off board / before start | unchanged tests | same state | yes |
| botFire replies | fire 99, botFire | player shots 1, turn `player`, message `^You .* Bot ` | |
| botFire ignored | on player turn; while placing | same state | yes |
| full game | fire + botFire loop | `over`, a winner, player shots = enemy shots − (player won ? 1 : 0) | yes |
| reset mid-game | fire, botFire, reset | `toEqual(initialState())` | |

The UI (delay, layout, animations) has no unit tests, because there's no React testing library and none is being added. It is covered by Task 7.

### Edge Cases Checklist
- [x] Player's winning shot: no bot turn (`phase: 'over'` early return)
- [x] Bot's winning shot: `over`, winner `bot`
- [x] Reset during the bot delay: timer cleared, stray `botFire` ignored
- [x] StrictMode double effect: guarded by `turn`
- [x] Rapid taps during the delay: enemy cells disabled, and the reducer guard backs that up
- [x] Sinking shot: `last` still marks the shot cell (new Map key is appended)
- [ ] Landscape phone: out of scope (see Risks)

---

## Validation Commands

### Static Analysis
```bash
npx tsc -b && npm run lint
```
EXPECT: zero type errors; zero lint errors.

### Unit Tests
```bash
npx vitest run src/game/reducer.test.ts
```
EXPECT: all pass.

### Full Test Suite
```bash
npm test
```
EXPECT: all pass (49 before; about 51–52 after, given 2 replaced and about 3 added).

### Build
```bash
npm run build
```
EXPECT: success; JS gzip stays about 71 kB (no new dependencies).

### Browser Validation
```bash
npm run dev   # already running as background task buoiellsg; reuse it
```
EXPECT: Task 7 checks pass.

### Manual Validation (optional, real phone)
- [ ] `npm run dev -- --host`, then open the LAN URL on a phone on the same trusted Wi-Fi. (This exposes the dev server to the local network; stop it afterwards.)
- [ ] Play one game. Checks: no scroll in battle, taps register, no double-tap zoom, the bot's shot is visible on the minimap.

---

## Acceptance Criteria
- [ ] All tasks completed
- [ ] Type check, lint, tests and build pass
- [ ] Battle screen fits 375×667 and 360×640 with no vertical scroll
- [ ] The bot replies about 600 ms after the player's shot, and enemy cells are locked meanwhile
- [ ] Miss, hit and sunk animations play; the last shot is marked on both boards
- [ ] Reduced motion disables the animations; light mode is readable
- [ ] Placement drag/tap still works on mobile emulation

## Completion Checklist
- [ ] Reducer stays pure; the timer lives only in `App`
- [ ] Invalid actions return the same state (no throws)
- [ ] The enemy board's `showShips` privacy is unchanged
- [ ] One `role="status"` element, never remounted
- [ ] No new dependencies, no web fonts
- [ ] CLAUDE.md updated
- [ ] Self-contained: no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 10×10 enemy cells about 30 px on a 375 px phone (below the 44 px tap guideline) | H | M | Inherent to 10×10; the enemy grid gets the maximum width; `.last` outline and focus ring; validate in the playtest |
| `230px` height budget wrong on real browser chrome (iOS toolbars) | M | M | `dvh` tracks the visible viewport; tune in Task 7; real-phone LAN check |
| Landscape phones get a small enemy grid (`100dvh - 230px`) | M | L | Out of scope; portrait-first. Follow-up: a `(orientation: landscape) and (max-height: 500px)` side-by-side rule |
| Sweep animation costs battery or paint | L | L | Transform-only (composited); off under reduced motion |
| The 600 ms delay feels slow for fast players | L | L | Single constant `BOT_DELAY_MS`; tune in the Phase 5 playtest |

## Notes
- The PRD's open questions on mobile layout and visual direction are resolved by this plan (decided by the user on 2026-10-24).
- The medium-bot report noted: "A bot reply delay (Phase 4) would make the target-mode follow-ups visible to the player." This plan delivers that, together with the minimap `.last` marker.
- `message` concatenation in `botFire` relies on `botFire` always directly following `fire`. The turn guard enforces that ordering.
