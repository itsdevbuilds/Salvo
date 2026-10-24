---
type: summary
status: complete
tags: [salvo, battleship, mobile, responsive, animation, neon-radar, bot-delay, phase-4, implementation-report]
relatedTo: [salvo, salvo-battleship-prd, mobile-polish-plan]
---

# Implementation Report: Mobile + Polish

## Summary
On a phone, the battle screen now fits without scrolling. The enemy grid sits on top, sized to the viewport. Your fleet appears as a minimap beside the status line. On desktop, the two grids sit side by side.

The theme is a dark-first "neon radar" look:
- a radar sweep over the enemy grid
- CSS-only animations: a ping on a miss, a flare on a hit, a pulse on a sunk ship
- an outline on the latest shot on each board
- a readable light mode

The bot now replies 600 ms after your shot. The reducer's single `fire` action was split into `fire` and `botFire`, with a `turn` field to track whose shot is next. `App` dispatches `botFire` on a timer, so the reducer stays pure.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium |
| Confidence | 8/10 | Single pass; one CSS fix after the browser check |
| Files Changed | 8 | 8 + this report |
| Tests | ~51–52 | 52 (4 new; 1 replaced; 4 adjusted) |
| Height budget `230px` | "likely needs tuning" | No change needed (see below) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Reducer turn split | Complete | As planned |
| 2 | Reducer tests | Complete | 23 reducer tests pass |
| 3 | App bot delay + hud layout | Complete | Comment marks the single `role=status` element |
| 4 | Grid `last` marker | Complete | |
| 5 | Neon radar stylesheet | Complete | Plus: sweep hidden under reduced motion |
| 6 | index.html + CLAUDE.md | Complete | |
| 7 | Browser validation | Complete | See below |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc -b` clean; `oxlint` exit 0 |
| Unit Tests | Pass | 52/52 |
| Build | Pass | JS 227.6 kB / 71.6 kB gzip (was 71.4); CSS 1.6 kB gzip |
| Integration (browser) | Pass | Chrome DevTools emulation; numbers below |
| Edge Cases | Pass | Loss path, reset, drag, reduced motion, light mode |

### Browser numbers
- **375×667, dark, mobile + touch:**
  - No vertical scroll (`scrollHeight` 667). The enemy grid spans 31–376 px and is 345 px wide. The minimap ends at 553 px.
  - Bot reply arrived after about 620 ms. Enemy cells were disabled in between, and all 99 open cells were re-enabled afterwards.
  - A fresh hit runs `flare`. The `.last` outline shows on both boards.
  - Full game: the bot won after 50 player shots. The status turned orange (`rgb(255, 122, 26)`), the sunk cells ran `sink`, and Play again worked.
- **360×640, light, reduced motion:**
  - No scroll (content ends at 534 px).
  - Cell animation `none`.
  - Light palette readable (screenshot checked).
- **1280×800 desktop:** enemy grid at x=228 and your grid at x=652 (side by side), status line under your grid, no scroll.
- **Placement at 375×667:** dragging the Carrier from the tray onto C3 placed it on cells 22–26. The status line sits above the grid.
- **Console:** one 404 for `/favicon.ico`. This predates the phase, since the project has no favicon. There are no other errors.

### Why `230px` held
On phones the enemy grid's width is limited by `92vw` (345 px at 375 wide), not by the viewport height (`100dvh - 230px` = 437 px). The height limit only applies to short viewports such as an iOS Safari visible area of about 553 px, where it gives 323 px. In that case the content ends at about 531 px, which still fits.

## Files Changed

| File | Action | Lines |
|---|---|---|
| `src/game/reducer.ts` | UPDATED | +15 / -13 |
| `src/game/reducer.test.ts` | UPDATED | +26 / -7 |
| `src/App.tsx` | UPDATED | +25 / -11 |
| `src/Grid.tsx` | UPDATED | +3 / -1 |
| `src/index.css` | UPDATED | +193 / -28 |
| `index.html` | UPDATED | +2 |
| `CLAUDE.md` | UPDATED | +2 / -1 |
| `.claude/PRPs/prds/salvo-battleship.prd.md` | UPDATED | Phase 4 complete, open questions resolved, 3 decision rows |

## Deviations from Plan
- **Sweep hidden under `prefers-reduced-motion`.** With animations off, the conic sweep froze as a static shaded wedge in one corner of the enemy grid, which read as a rendering glitch. The reduced-motion block now also sets `.grid-enemy::before { display: none }`.
- **Small style extras beyond the sketch:** `box-sizing: border-box` on `.grid`, a glow on `button.primary`, accent-coloured `.ship-len`, and an `[role='status'] { margin: 0 }` reset. These are visual consistency changes only.

## Issues Encountered
- The GateGuard hook asked for facts before the first edit; I stated them.
- A CSS hot reload during checking reset the game to the placement screen. That was a test artifact; I started a fresh game and re-checked.

## Observations
- In the accessibility tree the status line comes after the player grid, even while placing (CSS `order` only changes the visual order). The live region still announces, but a screen-reader user reads the grid first. That's acceptable; reorder the DOM if it matters.
- A favicon is missing. Fold it into Phase 5 (Lighthouse/SEO).
- Tap targets: enemy cells are about 32 px at 375 px wide, below the 44 px guideline. This is inherent to a 10×10 grid; check it in the Phase 5 playtest.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `src/game/reducer.test.ts` | +4 new, 1 replaced, 4 adjusted (23 total) | fire hands over the turn; fire ignored on the bot's turn; botFire replies and returns the turn; botFire ignored on the player's turn and while placing; full game, repeat shot and reset via fire + botFire |

## Next Steps
- [ ] `/code-review`
- [ ] `/prp-commit` + `/prp-pr` on `feat/mobile-polish`
- [ ] Optional real-phone check: `npm run dev -- --host` on trusted Wi-Fi
- [ ] `/prp-plan` Phase 5 (Deploy + playtest)
