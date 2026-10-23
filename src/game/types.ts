export const BOARD_SIZE = 10
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE

// 0..99, row * BOARD_SIZE + col
export type Cell = number
export type Orientation = 'h' | 'v'
export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer'

export const FLEET: readonly { type: ShipType; length: number }[] = [
  { type: 'carrier', length: 5 },
  { type: 'battleship', length: 4 },
  { type: 'cruiser', length: 3 },
  { type: 'submarine', length: 3 },
  { type: 'destroyer', length: 2 },
]

export type Ship = { type: ShipType; cells: readonly Cell[] }
export type ShotResult = 'miss' | 'hit' | 'sunk'
export type Board = { ships: readonly Ship[]; shots: ReadonlyMap<Cell, ShotResult> }
