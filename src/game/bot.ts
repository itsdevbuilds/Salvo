import { CELL_COUNT, type Cell, type ShotResult } from './types'

// stand-in until the Phase 2 hunt/target bot; sees only its own shot history, never the player's ships
export function randomShot(shots: ReadonlyMap<Cell, ShotResult>, rng: () => number = Math.random): Cell {
  const open = Array.from({ length: CELL_COUNT }, (_, c) => c).filter((c) => !shots.has(c))
  if (open.length === 0) throw new Error('randomShot: no cells left')
  return open[Math.floor(rng() * open.length)]
}
