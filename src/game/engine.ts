import {
  BOARD_SIZE,
  CELL_COUNT,
  FLEET,
  type Board,
  type Cell,
  type Orientation,
  type Ship,
  type ShipType,
  type ShotResult,
} from './types'

export const toCell = (row: number, col: number): Cell => row * BOARD_SIZE + col
export const rowOf = (cell: Cell) => Math.floor(cell / BOARD_SIZE)
export const colOf = (cell: Cell) => cell % BOARD_SIZE
// 'A1'..'J10': row letter, 1-based column
export const cellName = (cell: Cell) => `${String.fromCharCode(65 + rowOf(cell))}${colOf(cell) + 1}`

export const inRange = (cell: Cell) => Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT

export const emptyBoard = (): Board => ({ ships: [], shots: new Map() })

export const shipLength = (type: ShipType) => FLEET.find((f) => f.type === type)!.length

// fleet entries not yet on the board, in FLEET order
export const unplaced = (board: Board) => FLEET.filter((f) => !board.ships.some((s) => s.type === f.type))

// null when the ship would leave the board (horizontal ships must not wrap rows)
export function shipCells(origin: Cell, length: number, orientation: Orientation): Cell[] | null {
  if (!inRange(origin)) return null
  const start = orientation === 'h' ? colOf(origin) : rowOf(origin)
  if (start + length > BOARD_SIZE) return null
  const step = orientation === 'h' ? 1 : BOARD_SIZE
  return Array.from({ length }, (_, i) => origin + i * step)
}

export const canPlace = (ships: readonly Ship[], cells: readonly Cell[]) =>
  !ships.some((ship) => ship.cells.some((c) => cells.includes(c)))

export function placeShip(board: Board, type: ShipType, origin: Cell, orientation: Orientation): Board {
  if (board.ships.some((s) => s.type === type)) throw new Error(`placeShip: ${type} already placed`)
  const length = shipLength(type)
  const cells = shipCells(origin, length, orientation)
  if (!cells || !canPlace(board.ships, cells)) throw new Error(`placeShip: invalid position for ${type}`)
  return { ...board, ships: [...board.ships, { type, cells }] }
}

// ponytail: rejection sampling, always terminates fast for the standard fleet on 10x10
export function randomFleet(rng: () => number = Math.random): Ship[] {
  const ships: Ship[] = []
  for (const { type, length } of FLEET) {
    let cells: Cell[] | null
    do {
      const orientation: Orientation = rng() < 0.5 ? 'h' : 'v'
      cells = shipCells(Math.floor(rng() * CELL_COUNT), length, orientation)
    } while (!cells || !canPlace(ships, cells))
    ships.push({ type, cells })
  }
  return ships
}

export const isShot = (board: Board, cell: Cell) => board.shots.has(cell)

// a ship cell can only ever be marked hit/sunk, so "shot" means "hit"
export const isSunk = (ship: Ship, shots: ReadonlyMap<Cell, ShotResult>) =>
  ship.cells.every((c) => shots.has(c))

export type FireOutcome = { board: Board; result: ShotResult; sunk?: ShipType }

export function fire(board: Board, cell: Cell): FireOutcome {
  if (!inRange(cell)) throw new Error(`fire: cell ${cell} out of range`)
  if (isShot(board, cell)) throw new Error(`fire: cell ${cell} already shot`)
  const shots = new Map(board.shots)
  const ship = board.ships.find((s) => s.cells.includes(cell))
  if (!ship) {
    shots.set(cell, 'miss')
    return { board: { ...board, shots }, result: 'miss' }
  }
  shots.set(cell, 'hit')
  if (!isSunk(ship, shots)) return { board: { ...board, shots }, result: 'hit' }
  for (const c of ship.cells) shots.set(c, 'sunk')
  return { board: { ...board, shots }, result: 'sunk', sunk: ship.type }
}

export const allSunk = (board: Board) =>
  board.ships.length > 0 && board.ships.every((s) => isSunk(s, board.shots))
