---
type: plan
status: active
tags: [salvo, battleship, game-engine, vite, vitest, typescript, phase-1]
relatedTo: [salvo, salvo-battleship-prd]
---

# Plan: Scaffold + Game Engine

## Summary
Set up a Vite + React + TypeScript project with Vitest, then implement the Battleship rules as pure, framework-free TypeScript functions: fleet definition, ship placement/validation, random fleet generation, shot resolution, sunk and win detection. No UI beyond stripping the Vite template to a placeholder.

## User Story
As the developer of Salvo, I want a tested, UI-independent game engine, so that the bot (Phase 2) and the UI (Phase 3) can be built in parallel on a stable API.

## Problem → Solution
Empty repo (README, CLAUDE.md, .gitignore only) → runnable Vite app + `src/game/` engine with passing unit tests.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/salvo-battleship.prd.md`
- **PRD Phase**: 1 — Scaffold + engine
- **Estimated Files**: ~6 hand-written/edited (plus Vite template files)

---

## UX Design

### Before
N/A — internal change (no app exists).

### After
N/A — internal change. Browser shows a placeholder "Salvo" heading only.

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| `npm run dev` | n/a | Placeholder page | Real UI is Phase 3 |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `.claude/PRPs/prds/salvo-battleship.prd.md` | Technical Approach, Phase 1 | Architecture decisions (pure engine, bot isolation, useReducer later) |
| P1 | `.gitignore` | all | Must keep `.base-ast/` and `.base-ast-cache/` entries after scaffold |
| P1 | `CLAUDE.md` | all | Update with commands + architecture at end |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Vite scaffold | https://vite.dev/guide/ | `npm create vite@latest <dir> -- --template react-ts`; current Vite needs Node 20.19+/22.12+ (local: Node 24.14.1 ✓) |
| Vitest | https://vitest.dev/guide/ | Zero-config with Vite; `vitest run` for CI-style single run; filter by file path or `-t "<name>"` |

KEY_INSIGHT: create-vite prompts interactively when target dir is non-empty.
APPLIES_TO: Task 1.
GOTCHA: Scaffold into a temp subfolder and move files up, instead of scaffolding into `.` — avoids the prompt and avoids overwriting `README.md` / `.gitignore`.

---

## Patterns to Mirror

Greenfield repo — no existing code to mirror. These conventions are **established by this plan** and must be followed by later phases.

### NAMING_CONVENTION
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for components, tests co-located as `<module>.test.ts`.
- Types: `PascalCase`; constants: `UPPER_SNAKE_CASE`; functions: `camelCase` verbs (`placeShip`, `fire`, `isSunk`).

### DATA_MODEL
- A cell is a single `number` 0–99 (`row * BOARD_SIZE + col`). Avoids coord objects in equality checks / Sets. Helpers `toCell`, `rowOf`, `colOf` convert.
- All engine functions are **pure and immutable**: return new objects, never mutate inputs (required for `useReducer` in Phase 3).
- Randomness is injected: `rng: () => number = Math.random` parameter, so tests are deterministic.

### ERROR_HANDLING
- Expected "can't do that" cases return a value: `shipCells` → `null` if off-board; `canPlace` → `boolean`.
- Programmer errors (firing an already-shot or out-of-range cell, placing an invalid ship) `throw new Error('<fn>: <reason>')`. UI/bot must guard with `isShot` / `canPlace` first.

### LOGGING_PATTERN
None. Engine is pure; no logging.

### TEST_STRUCTURE
```ts
import { describe, it, expect } from 'vitest';
import { fire, randomFleet } from './engine';

describe('fire', () => {
  it('returns miss on empty water', () => { /* ... */ });
});
```
Explicit imports from `vitest` (no globals → no tsconfig changes).

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| Vite template files (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `eslint.config.js`, `public/`) | CREATE (via scaffold) | Project skeleton |
| `.gitignore` | UPDATE | Merge Vite's ignores with existing `.base-ast` entries |
| `package.json` | UPDATE | Add `vitest` devDep + `test` script; name `salvo` |
| `src/App.tsx` | UPDATE | Replace template demo with placeholder |
| `src/App.css`, `src/assets/react.svg`, `public/vite.svg` | DELETE | Template demo assets, unused |
| `src/game/types.ts` | CREATE | Engine types + fleet constant |
| `src/game/engine.ts` | CREATE | Pure rule functions |
| `src/game/engine.test.ts` | CREATE | Unit tests |
| `CLAUDE.md` | UPDATE | Commands + engine architecture |

## NOT Building

- Any game UI, board rendering, drag-and-drop (Phase 3).
- Any bot logic (Phase 2).
- `useReducer` game state machine (Phase 3).
- Salvo variant, adjacency ("no touching") rule — classic rules only; ships may touch.
- Prettier, Husky, CI config — not requested.

---

## Step-by-Step Tasks

### Task 1: Scaffold Vite project
- **ACTION**: Generate React + TS template and move it into repo root.
- **IMPLEMENT**:
  ```bash
  npm create vite@latest _scaffold -- --template react-ts
  # move everything except README.md and .gitignore up
  cd _scaffold && rm -f README.md && mv .gitignore ../.gitignore.vite && mv * ../ && cd .. && rmdir _scaffold
  cat .gitignore.vite >> .gitignore && rm .gitignore.vite
  npm install
  ```
  Set `"name": "salvo"` in `package.json`.
- **MIRROR**: n/a
- **GOTCHA**: `mv *` skips dotfiles — `.gitignore` handled explicitly above; check `ls -a _scaffold` for any other dotfile before `rmdir`. If create-vite asks extra prompts (e.g. "use rolldown-vite?"), choose defaults.
- **VALIDATE**: `npm run build` succeeds; `.gitignore` still contains `.base-ast/`, `.base-ast-cache/` and `node_modules`.

### Task 2: Strip template demo
- **ACTION**: Replace demo counter/logos with placeholder.
- **IMPLEMENT**: `src/App.tsx`:
  ```tsx
  export default function App() {
    return <h1>Salvo</h1>;
  }
  ```
  Delete `src/App.css`, `src/assets/react.svg`, `public/vite.svg`; remove the vite.svg `<link rel="icon">` from `index.html`; set `<title>Salvo</title>`. Keep `src/index.css` (Phase 4 restyles it).
- **GOTCHA**: Remove `import './App.css'` and asset imports or build fails.
- **VALIDATE**: `npm run build` and `npm run lint` pass.

### Task 3: Add Vitest
- **ACTION**: `npm i -D vitest`; add `"test": "vitest run"` to `package.json` scripts.
- **GOTCHA**: No `vite.config.ts` test block needed — default node environment suits pure logic. Add `jsdom` only in Phase 3 if component tests are needed.
- **VALIDATE**: `npm test` runs (reports no test files until Task 5 — acceptable).

### Task 4: Engine types + functions
- **ACTION**: Create `src/game/types.ts` and `src/game/engine.ts`.
- **IMPLEMENT** — `types.ts`:
  ```ts
  export const BOARD_SIZE = 10;
  export type Cell = number; // 0..99, row * BOARD_SIZE + col
  export type Orientation = 'h' | 'v';
  export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';
  export const FLEET: readonly { type: ShipType; length: number }[] = [
    { type: 'carrier', length: 5 },
    { type: 'battleship', length: 4 },
    { type: 'cruiser', length: 3 },
    { type: 'submarine', length: 3 },
    { type: 'destroyer', length: 2 },
  ];
  export type Ship = { type: ShipType; cells: readonly Cell[] };
  export type ShotResult = 'miss' | 'hit' | 'sunk';
  export type Board = { ships: readonly Ship[]; shots: ReadonlyMap<Cell, ShotResult> };
  ```
  `engine.ts` exports:
  - `toCell(row, col)`, `rowOf(cell)`, `colOf(cell)`
  - `emptyBoard(): Board`
  - `shipCells(origin: Cell, length: number, orientation: Orientation): Cell[] | null` — null if any cell leaves the board (horizontal must not wrap rows: check `colOf(origin) + length <= BOARD_SIZE`).
  - `canPlace(ships, cells): boolean` — no overlap with existing ships.
  - `placeShip(board, type, origin, orientation): Board` — throws if invalid or type already placed.
  - `randomFleet(rng = Math.random): Ship[]` — for each FLEET entry, retry random origin/orientation until `shipCells` non-null and `canPlace`.
  - `isShot(board, cell): boolean`
  - `isSunk(ship, shots): boolean` — every cell is a key in `shots`.
  - `fire(board, cell): { board: Board; result: ShotResult; sunk?: ShipType }` — throws if out of range or already shot; on hit, if ship now sunk, result `'sunk'` and mark **all** that ship's cells as `'sunk'` in the new shots map.
  - `allSunk(board): boolean` — `ships.length > 0 && ships.every(s => isSunk(s, board.shots))`.
- **MIRROR**: DATA_MODEL, ERROR_HANDLING.
- **IMPORTS**: `import { BOARD_SIZE, FLEET, type Board, type Cell, ... } from './types';` (`verbatimModuleSyntax` in Vite tsconfig requires `type` imports).
- **GOTCHA**: Copy the Map (`new Map(board.shots)`) before setting — never mutate. `randomFleet` rejection sampling always terminates in practice on 10×10 with this fleet; no attempt cap needed (`// ponytail:` note if desired).
- **VALIDATE**: `npx tsc -b` clean.

### Task 5: Engine tests
- **ACTION**: Create `src/game/engine.test.ts` covering the table below.
- **MIRROR**: TEST_STRUCTURE.
- **IMPLEMENT**: Use a seeded rng for repeatability, e.g. mulberry32 inline in the test file:
  ```ts
  const seeded = (s: number) => () => ((s = (s + 0x6d2b79f5) | 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 2 ** 32);
  ```
  (simplified; any deterministic `() => number` in [0,1) works).
- **VALIDATE**: `npm test` all green.

### Task 6: Update CLAUDE.md
- **ACTION**: Replace "Current state" section with commands (`npm run dev`, `npm run build`, `npm run lint`, `npm test`, single file `npx vitest run src/game/engine.test.ts`, single test `npx vitest run -t "<name>"`) and a short architecture note: engine in `src/game/` is pure/immutable, cells are numbers 0–99, rng injected, bot must never receive the opponent's `Board`.
- **VALIDATE**: Commands in CLAUDE.md all run.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| shipCells horizontal | origin (0,8), len 3, 'h' | null (wraps row) | Yes |
| shipCells vertical | origin (8,0), len 3, 'v' | null | Yes |
| shipCells valid | origin (0,0), len 5, 'h' | [0,1,2,3,4] | No |
| canPlace overlap | existing ship on cell 2, new cells [2,3] | false | Yes |
| placeShip duplicate type | place carrier twice | throws | Yes |
| randomFleet valid | 200 seeds | 5 ships, lengths 5,4,3,3,2, 17 unique in-range cells, no row wrap | Yes |
| fire miss | empty cell | result 'miss' | No |
| fire hit | ship cell, ship not done | 'hit' | No |
| fire sunk | last cell of destroyer | 'sunk', sunk: 'destroyer', both cells marked 'sunk' | No |
| fire repeat | already-shot cell | throws | Yes |
| fire out of range | -1, 100 | throws | Yes |
| fire immutability | any | original board.shots unchanged | Yes |
| allSunk | all 17 cells fired | true; with 16 → false; empty board → false | Yes |

### Edge Cases Checklist
- [x] Empty input — empty board `allSunk` false
- [x] Maximum size input — ship at board edge, last cell 99
- [x] Invalid input — out-of-range cell, repeat shot, duplicate ship
- [ ] Concurrent access — N/A (single-threaded, pure)
- [ ] Network failure — N/A (no network)
- [ ] Permission denied — N/A

---

## Validation Commands

### Static Analysis
```bash
npx tsc -b && npm run lint
```
EXPECT: Zero type/lint errors

### Unit Tests
```bash
npx vitest run src/game/engine.test.ts
```
EXPECT: All pass

### Full Test Suite
```bash
npm test
```
EXPECT: All pass

### Database Validation
N/A — no database.

### Browser Validation
```bash
npm run dev
```
EXPECT: Placeholder "Salvo" page at http://localhost:5173

### Manual Validation
- [ ] `git status` shows no `node_modules/`, `dist/`, `.base-ast*`
- [ ] `npm run build` produces `dist/`

---

## Acceptance Criteria
- [ ] All tasks completed
- [ ] All validation commands pass
- [ ] Tests written and passing
- [ ] No type errors
- [ ] No lint errors
- [ ] Engine has zero React imports

## Completion Checklist
- [ ] Engine functions pure and immutable
- [ ] Errors follow return-value vs throw split
- [ ] Tests co-located, explicit vitest imports
- [ ] Board size / fleet only defined in `types.ts`
- [ ] CLAUDE.md updated
- [ ] No unnecessary scope additions
- [ ] PRD Phase 1 marked complete after implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| create-vite prompt/output differs from plan (new version) | M | L | Scaffold in temp dir; accept defaults; verify build |
| Horizontal ships wrap rows in number-cell model | M | H | Explicit column bound check + dedicated test |
| Mutating Map breaks React state later | M | M | Copy-on-write in `fire`; immutability test |

## Notes
- Engine API is the contract for Phases 2 and 3; bot will consume only a view of shots it fired (`ReadonlyMap<Cell, ShotResult>`), never `Board.ships`.
- Map in state is fine for `useReducer` as long as each update creates a new Map.
