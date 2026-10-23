import { colOf, rowOf, toCell } from './engine'
import { BOARD_SIZE, CELL_COUNT, type Cell, type ShotResult } from './types'

// every bot tier sees only its own shot history, never the player's ships
export type Bot = (shots: ReadonlyMap<Cell, ShotResult>, rng?: () => number) => Cell

const pick = (cells: readonly Cell[], rng: () => number) => cells[Math.floor(rng() * cells.length)]

const openCells = (shots: ReadonlyMap<Cell, ShotResult>) =>
  Array.from({ length: CELL_COUNT }, (_, c) => c).filter((c) => !shots.has(c))

// the cell one step from `cell` along (dr, dc), or null off the board (no row wrap)
function step(cell: Cell, dr: number, dc: number): Cell | null {
  const r = rowOf(cell) + dr
  const c = colOf(cell) + dc
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE ? toCell(r, c) : null
}

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const

// Easy tier: anywhere it hasn't shot yet
export const randomShot: Bot = (shots, rng = Math.random) => {
  const open = openCells(shots)
  if (open.length === 0) throw new Error('randomShot: no cells left')
  return pick(open, rng)
}

// Medium tier. Stateless: fire() marks a sunk ship's cells 'sunk', so every 'hit' left is a ship still afloat.
export const huntTarget: Bot = (shots, rng = Math.random) => {
  if (shots.size >= CELL_COUNT) throw new Error('huntTarget: no cells left')
  const isHit = (c: Cell | null): c is Cell => c !== null && shots.get(c) === 'hit'
  const isOpen = (c: Cell | null): c is Cell => c !== null && !shots.has(c)
  const hits = [...shots.keys()].filter(isHit)

  // target: past the end of a line of hits (each direction from each hit reaches every end; Set dedupes)
  const ends = new Set<Cell>()
  for (const hit of hits)
    for (const [dr, dc] of DIRS) {
      if (!isHit(step(hit, dr, dc))) continue
      let c: Cell | null = hit
      while (isHit(c)) c = step(c, dr, dc)
      if (isOpen(c)) ends.add(c)
    }
  if (ends.size) return pick([...ends], rng)

  // target: next to any hit
  const near = new Set(hits.flatMap((h) => DIRS.map(([dr, dc]) => step(h, dr, dc))).filter(isOpen))
  if (near.size) return pick([...near], rng)

  // hunt: checkerboard, since every ship spans both colours
  const open = openCells(shots)
  const parity = open.filter((c) => (rowOf(c) + colOf(c)) % 2 === 0)
  return pick(parity.length ? parity : open, rng)
}
