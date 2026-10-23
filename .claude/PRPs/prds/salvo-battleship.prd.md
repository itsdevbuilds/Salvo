---
type: spec
status: draft
tags: [salvo, battleship, prd, react, typescript, browser-game, mobile-first]
relatedTo: [salvo]
---

# Salvo — Browser Battleship vs. Bot

## Problem Statement

Friends and casual players who want a quick game of Battleship on their phone hit slow sites, forced sign-ups, dated UI, and layouts that break on mobile. The cost: they give up before the first shot, so there's no low-friction way to kill a few minutes or share a game with friends.

## Evidence

- Owner has tried several existing Battleship sites; they performed poorly on phones (first-hand observation).
- Owner reports existing sites are slow, require sign-up, and have dated graphics/UI (first-hand observation).
- Web search for free no-signup Battleship surfaced many spammy/low-quality pages alongside a few legitimate options — signal of a weak field, not verified hands-on.
- Assumption - "friends will replay" needs validation through a friend playtest after deploy.

## Proposed Solution

A single-page, static React + TypeScript web app: open the link, place your fleet (drag, tap, or randomize), and play classic Battleship against a bot — no login, no backend. Differentiation is not "free/no signup" (others offer that) but speed, modern visuals, and a phone-first touch experience. Game rules and bot live in pure TypeScript, separate from UI, so they're testable and the bot can be upgraded in difficulty tiers.

## Key Hypothesis

We believe a fast, modern, mobile-first Battleship with zero sign-up will beat clunky existing sites for friends and casual players.
We'll know we're right when friends finish a full game on their phone without friction and choose to play again.

## What We're NOT Building

- Multiplayer vs. humans - bot-only for now; needs realtime backend.
- Accounts / login - contradicts the zero-friction core.
- Online leaderboards - requires backend + identity.
- Backend of any kind - static hosting only, free and simple.
- Ads - core complaint about existing sites.
- Native app-store apps - web link is the distribution channel.
- Per-user tracking analytics - no PII collected; avoids privacy compliance scope.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time to first shot | < 30s from link open (incl. fleet placement via randomize) | Manual timing in playtest |
| Initial load | < 2s on mobile 4G; Lighthouse performance ≥ 90 | Lighthouse mobile audit |
| Full game length | < 10 min | Playtest observation |
| Mobile usability | 0 blocking issues on iOS Safari + Android Chrome | Friend playtest |
| Replay | ≥ 3 of 5 playtesters start a second game unprompted | Friend playtest |
| Bot feel | Medium bot wins a meaningful share of games (target TBD - needs playtest) | Playtest + simulated games |

## Open Questions

- [ ] Should "Salvo" variant (shots per turn = ships remaining) be the default mode, given the product name?
- [ ] Mobile layout: one board at a time with turn-based switching, or both boards stacked?
- [ ] Is any analytics needed to measure replay, or is friend feedback enough?
- [ ] Visual direction: clean flat, neon radar, or other?

---

## Users & Context

**Primary User**
- **Who**: Friend group member or casual player on a phone with a few spare minutes.
- **Current behavior**: Tries existing Battleship sites; abandons due to sign-up walls, slowness, poor mobile layout.
- **Trigger**: Boredom (commute, break) or a friend sharing a link.
- **Success state**: Playing within seconds, finishing a satisfying match, wanting another.

**Job to Be Done**
When I have a few spare minutes on my phone, I want to start a Battleship game instantly without an account, so I can enjoy a quick, satisfying match against a fair-but-challenging bot.

**Non-Users**
Competitive players wanting ranked matchmaking; people wanting a native app; anyone needing human-vs-human multiplayer (for now).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Instant play, no login, static site | Core differentiator / pain point |
| Must | Fleet placement: drag, tap-to-place, rotate, randomize | Placement is the main mobile friction point |
| Must | Classic rules: 10×10, 5 ships (5,4,3,3,2), one shot per turn, no overlap | Familiar baseline |
| Must | Medium bot (hunt/target) | Must feel like a real opponent |
| Must | Phone-first responsive layout with touch | Main complaint about existing sites |
| Must | Hit / miss / sunk feedback animations, win/lose screen, play again | "Modern UI" + replay loop |
| Should | Easy (random) and Hard (probability density) bots | Difficulty choice extends replay |
| Should | Sound effects (mutable) | Game feel |
| Could | Salvo rule variant | Fits product name |
| Could | Local stats in localStorage (wins, shots, accuracy) | Replay motivation, no backend |
| Could | PWA: installable, offline | Nice for mobile, not core |
| Won't | Multiplayer, accounts, leaderboards, ads | See out of scope |

### MVP Scope

One page: place standard fleet (drag/tap/randomize), play vs. Medium bot until one fleet sinks, win/lose screen, play again. Works on iOS Safari and Android Chrome. Deployed to a free static host.

### User Flow

Open link → fleet placement screen (Randomize or drag/tap ships, rotate) → Start → take turns firing at bot grid; bot fires back → hit/miss/sunk feedback → last ship sinks → win/lose screen → Play again.

---

## Technical Approach

**Feasibility**: HIGH

**Architecture Notes**
- Vite + React + TypeScript; Vitest for engine tests.
- Game engine as pure TS functions (board, placement validation, shot resolution, sunk/win detection), independent of React.
- Bot as pure function `(knowledge of own shots) → next target`; never receives the player's board. Tiers: random → hunt/target (+ parity) → probability density.
- State via `useReducer` driving phases: placement → playing → game over. No state library.
- `@dnd-kit/core` for drag-and-drop (native HTML5 DnD lacks touch support on mobile) plus tap-to-place fallback.
- Animations via CSS first; add Motion (framer-motion) only if CSS falls short.
- Static hosting: GitHub Pages / Netlify / Vercel (free).

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Touch drag-and-drop on small grid (finger occlusion, rotate) | H | dnd-kit, tap-to-place, rotate button, randomize button |
| Two 10×10 grids don't fit on a phone screen | M | Single active board per turn or own-fleet minimap |
| Bot accidentally "cheats" via access to player board | L | Bot API only receives its own shot history |
| Medium bot too easy/hard | M | Simulate bot-vs-random-fleet games in tests; tune in playtest |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Scaffold + engine | Vite/React/TS project, pure TS game rules with tests | complete | - | - | [plan](../plans/completed/scaffold-and-engine.plan.md) · [report](../reports/scaffold-and-engine-report.md) |
| 2 | Medium bot | Hunt/target bot with parity, tested via simulated games | pending | with 3 | 1 | - |
| 3 | Core UI | Boards, placement (drag/tap/rotate/randomize), turn flow, win/lose | complete | with 2 | 1 | [plan](../plans/completed/core-ui.plan.md) · [report](../reports/core-ui-report.md) |
| 4 | Mobile + polish | Phone layout, animations, visual style | pending | - | 2, 3 | - |
| 5 | Deploy + playtest | Static deploy, Lighthouse check, friend playtest | pending | - | 4 | - |

### Phase Details

**Phase 1: Scaffold + engine**
- **Goal**: Correct, tested game rules independent of UI.
- **Scope**: Vite + React + TS + Vitest setup; types for board/ship/shot; placement validation; random fleet; shot resolution; sunk and win detection.
- **Success signal**: Engine tests pass; random fleets always valid.

**Phase 2: Medium bot**
- **Goal**: Bot that feels like a real opponent.
- **Scope**: Hunt/target with parity; interface allowing later Easy/Hard tiers.
- **Success signal**: Simulated games finish with average shots well below random (~96 turns for 50% win per published analyses).

**Phase 3: Core UI**
- **Goal**: Playable end-to-end game in the browser.
- **Scope**: Placement screen (dnd-kit + tap + rotate + randomize), battle screen, turn handling, game-over screen, play again.
- **Success signal**: Full game playable on desktop and mobile emulation.

**Phase 4: Mobile + polish**
- **Goal**: Phone-first, modern feel.
- **Scope**: Responsive layout decision (open question), hit/miss/sunk animations, visual theme.
- **Success signal**: No blocking issues on real iOS Safari and Android Chrome.

**Phase 5: Deploy + playtest**
- **Goal**: Validate the hypothesis.
- **Scope**: Static deploy, Lighthouse mobile audit, playtest with ~5 friends.
- **Success signal**: Metrics in Success Metrics table met.

### Parallelism Notes

Phases 2 and 3 both depend only on the engine API from Phase 1; bot is pure logic and UI can use a stub random bot until Phase 2 lands.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Opponent | Bot only | Human multiplayer | No backend; fastest path to playable |
| Stack | React + TypeScript + Vite | Plain JS, Svelte | Owner preference; learning goal |
| Drag-and-drop | ~~@dnd-kit/core + tap fallback~~ (superseded) | Native HTML5 DnD | HTML5 DnD lacks mobile touch support |
| Drag-and-drop (Phase 3) | Native pointer events + `elementFromPoint`, plus tap-to-place | @dnd-kit/core (no release since 2024-12), @dnd-kit/react (0.x) | No dependency; snapping to a 10×10 grid is ~25 lines and pointer events cover touch |
| State | useReducer | Zustand/Redux | Single screen, linear phases |
| Hosting | Static (GH Pages/Netlify/Vercel) | Server | Free, no backend needed |
| MVP difficulty | Medium (hunt/target) | Random, probability density | Feels real without complexity; others deferred |

---

## Research Summary

**Market Context**
Free, no-signup Battleship vs. AI already exists (e.g., listings on rarepike.com, Maritime Conflict on pcgamecheck.com), some with difficulty levels. Search results also contain many spammy or low-quality pages. Differentiation must be speed, modern visuals, and mobile UX rather than "free/no signup". Competitor sites not hands-on verified.

**Technical Context**
No existing codebase. Bot strategies are well documented (Nick Berry / DataGenetics via secondary sources): random ≈ 96 turns to win 50% of games; hunt/target ≈ 66 avg; + parity ≈ 62–65; probability density best. Figures from secondary write-ups with mixed metrics. Probability density on a 10×10 grid is computationally trivial in-browser.

Sources: https://rarepike.com/best-sites-to-play-battleship-online/, https://pcgamecheck.com/play/maritime-conflict, https://rarepike.com/ship/probability-targeting/, https://paulvanderlaken.com/page/32/

---

*Generated: 2026-10-20*
*Status: DRAFT - needs validation*
