import { describe, it, expect } from 'vitest'
import {
  allSunk,
  canPlace,
  cellName,
  emptyBoard,
  fire,
  placeShip,
  randomFleet,
  rowOf,
  shipCells,
  toCell,
} from './engine'
import { seeded } from './test-utils'
import { BOARD_SIZE, FLEET, type Board } from './types'

const withDestroyer = (): Board => placeShip(emptyBoard(), 'destroyer', toCell(0, 0), 'h') // cells 0, 1

describe('cellName', () => {
  it('names cells by row letter and 1-based column', () => {
    expect(cellName(0)).toBe('A1')
    expect(cellName(toCell(1, 3))).toBe('B4')
    expect(cellName(99)).toBe('J10')
  })
})

describe('shipCells', () => {
  it('returns cells for a valid placement', () => {
    expect(shipCells(toCell(0, 0), 5, 'h')).toEqual([0, 1, 2, 3, 4])
    expect(shipCells(toCell(0, 0), 3, 'v')).toEqual([0, 10, 20])
  })

  it('rejects horizontal ships that would wrap to the next row', () => {
    expect(shipCells(toCell(0, 8), 3, 'h')).toBeNull()
  })

  it('rejects vertical ships that run off the bottom', () => {
    expect(shipCells(toCell(8, 0), 3, 'v')).toBeNull()
  })

  it('accepts ships flush with the last row and column', () => {
    expect(shipCells(toCell(9, 7), 3, 'h')).toEqual([97, 98, 99])
    expect(shipCells(toCell(7, 9), 3, 'v')).toEqual([79, 89, 99])
  })

  it('rejects out-of-range origins', () => {
    expect(shipCells(-1, 2, 'h')).toBeNull()
    expect(shipCells(100, 2, 'h')).toBeNull()
  })
})

describe('canPlace / placeShip', () => {
  it('detects overlap', () => {
    const { ships } = withDestroyer()
    expect(canPlace(ships, [1, 2])).toBe(false)
    expect(canPlace(ships, [2, 3])).toBe(true)
  })

  it('throws when placing the same ship type twice', () => {
    expect(() => placeShip(withDestroyer(), 'destroyer', toCell(5, 5), 'h')).toThrow()
  })

  it('throws on overlap or off-board placement', () => {
    expect(() => placeShip(withDestroyer(), 'cruiser', toCell(0, 1), 'v')).toThrow()
    expect(() => placeShip(emptyBoard(), 'carrier', toCell(0, 6), 'h')).toThrow()
  })

  it('does not mutate the input board', () => {
    const board = emptyBoard()
    placeShip(board, 'destroyer', 0, 'h')
    expect(board.ships).toHaveLength(0)
  })
})

describe('randomFleet', () => {
  it('always produces a valid standard fleet', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const ships = randomFleet(seeded(seed))
      expect(ships.map((s) => s.cells.length)).toEqual(FLEET.map((f) => f.length))
      const cells = ships.flatMap((s) => s.cells)
      expect(new Set(cells).size).toBe(17)
      for (const ship of ships) {
        expect(ship.cells.every((c) => c >= 0 && c < BOARD_SIZE * BOARD_SIZE)).toBe(true)
        const rows = new Set(ship.cells.map(rowOf))
        const step = ship.cells[1] - ship.cells[0]
        // horizontal ships stay in one row; vertical ships step by a full row
        expect(step === 1 ? rows.size === 1 : step === BOARD_SIZE).toBe(true)
      }
    }
  })
})

describe('fire', () => {
  it('returns miss on empty water', () => {
    expect(fire(withDestroyer(), 50).result).toBe('miss')
  })

  it('returns hit on a ship that is still afloat', () => {
    expect(fire(withDestroyer(), 0).result).toBe('hit')
  })

  it('returns sunk on the last cell and marks every cell of the ship', () => {
    const first = fire(withDestroyer(), 0)
    const second = fire(first.board, 1)
    expect(second.result).toBe('sunk')
    expect(second.sunk).toBe('destroyer')
    expect(second.board.shots.get(0)).toBe('sunk')
    expect(second.board.shots.get(1)).toBe('sunk')
  })

  it('throws on a repeat shot', () => {
    const { board } = fire(withDestroyer(), 50)
    expect(() => fire(board, 50)).toThrow()
  })

  it('throws on out-of-range cells', () => {
    expect(() => fire(withDestroyer(), -1)).toThrow()
    expect(() => fire(withDestroyer(), 100)).toThrow()
    expect(() => fire(withDestroyer(), 1.5)).toThrow()
  })

  it('does not mutate the input board', () => {
    const board = withDestroyer()
    fire(board, 0)
    expect(board.shots.size).toBe(0)
  })
})

describe('allSunk', () => {
  it('is false for an empty board', () => {
    expect(allSunk(emptyBoard())).toBe(false)
  })

  it('is true only after every ship cell is hit', () => {
    let board: Board = { ships: randomFleet(seeded(42)), shots: new Map() }
    const cells = board.ships.flatMap((s) => s.cells)
    for (const cell of cells.slice(0, -1)) board = fire(board, cell).board
    expect(allSunk(board)).toBe(false)
    board = fire(board, cells[cells.length - 1]).board
    expect(allSunk(board)).toBe(true)
  })
})
