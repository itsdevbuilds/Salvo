# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Salvo: a fast, modern, browser-based Battleship game. Planned features (from README): play vs. a smart AI, drag-and-drop fleet placement, mobile-friendly UI, no sign-up.

Product plan and phased roadmap: `.claude/PRPs/prds/salvo-battleship.prd.md`.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — type-check (`tsc -b`) + production build
- `npm run lint` — oxlint (not ESLint)
- `npm test` — Vitest, single run
- Single file: `npx vitest run src/game/engine.test.ts`; single test: `npx vitest run -t "<test name>"`

## Architecture

Static client-only React + TypeScript app (Vite). No backend, no accounts.

- `src/game/` — game rules as pure TypeScript, no React imports. All functions are immutable (return new `Board`/`Map`, never mutate) so they can drive `useReducer` state.
- A cell is a number 0–99 (`row * BOARD_SIZE + col`); use `toCell` / `rowOf` / `colOf`. Board size and fleet are defined only in `src/game/types.ts`.
- Randomness is injected (`rng: () => number = Math.random`) so tests are deterministic.
- Errors: expected "can't do that" returns a value (`shipCells` → `null`, `canPlace` → `boolean`); invalid calls (repeat shot, bad placement) throw. Callers guard with `isShot` / `canPlace` first.
- The bot must never receive the opponent's `Board` (which includes ship positions) — only the shot results it has observed.
- `src/game/reducer.ts` — the whole game flow (`placing → playing → over`) as a pure reducer. Randomness enters via optional `rng` on actions; invalid actions (misclicks, wrong phase) return the same state and never throw. `App.tsx` / `Grid.tsx` only render and dispatch.
- `src/game/bot.ts` — `randomShot` is a stand-in until the Phase 2 hunt/target bot; it receives only the shots map.
- Drag-and-drop uses native pointer events + `document.elementFromPoint` (no dnd library), with pointer capture on press so release anywhere ends the drag. `touch-action: none` only on the tray and the player grid while placing (`.grid-drag`), so the page still scrolls in battle. Placement cells also act on keyboard click (`e.detail === 0`).

Code style follows the Vite template: no semicolons, single quotes, `import { type X }` for types (`verbatimModuleSyntax`), tests co-located as `*.test.ts` with explicit `vitest` imports.
