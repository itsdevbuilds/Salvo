import { describe, it, expect } from 'vitest'
import { huntTarget, randomShot, type Bot } from './bot'
import { allSunk, colOf, fire, randomFleet, rowOf } from './engine'
import { seeded } from './test-utils'
import { type Board, type Cell, type ShotResult } from './types'

const shotsOf = (entries: [Cell, ShotResult][]) => new Map<Cell, ShotResult>(entries)
const parity = (c: Cell) => (rowOf(c) + colOf(c)) % 2

// every result the bot gives for this history across many seeds
const answers = (shots: ReadonlyMap<Cell, ShotResult>) =>
  new Set(Array.from({ length: 50 }, (_, i) => huntTarget(shots, seeded(i + 1))))

// shots the bot needs to sink a random fleet; fire() throws on a repeat or off-board shot
function play(bot: Bot, seed: number) {
  const rng = seeded(seed)
  let board: Board = { ships: randomFleet(rng), shots: new Map() }
  let n = 0
  while (!allSunk(board)) {
    board = fire(board, bot(board.shots, rng)).board
    n++
  }
  return n
}

const GAMES = 300
const average = (bot: Bot) => Array.from({ length: GAMES }, (_, i) => play(bot, i + 1)).reduce((a, b) => a + b) / GAMES

describe('randomShot', () => {
  it('never repeats a cell and throws once the board is exhausted', () => {
    const rng = seeded(1)
    const shots = new Map<Cell, ShotResult>()
    for (let i = 0; i < 100; i++) {
      const cell = randomShot(shots, rng)
      expect(shots.has(cell)).toBe(false)
      expect(cell >= 0 && cell < 100).toBe(true)
      shots.set(cell, 'miss')
    }
    expect(shots.size).toBe(100)
    expect(() => randomShot(shots, rng)).toThrow()
  })
})

describe('huntTarget', () => {
  it('hunts on the checkerboard', () => {
    const rng = seeded(3)
    const shots = new Map<Cell, ShotResult>()
    for (let i = 0; i < 20; i++) {
      const cell = huntTarget(shots, rng)
      expect(parity(cell)).toBe(0)
      shots.set(cell, 'miss')
    }
  })

  it('falls back to the other colour once the checkerboard is used up', () => {
    const shots = shotsOf(Array.from({ length: 100 }, (_, c): [Cell, ShotResult] => [c, 'miss']).filter(([c]) => parity(c) === 0))
    const cell = huntTarget(shots, seeded(1))
    expect(parity(cell)).toBe(1)
    expect(shots.has(cell)).toBe(false)
  })

  it('targets the neighbours of a lone hit', () => {
    expect(answers(shotsOf([[44, 'hit']]))).toEqual(new Set([34, 54, 43, 45]))
  })

  it('extends a line of hits from either end', () => {
    expect(answers(shotsOf([[44, 'hit'], [45, 'hit']]))).toEqual(new Set([43, 46]))
    expect(answers(shotsOf([[44, 'hit'], [54, 'hit']]))).toEqual(new Set([34, 64]))
  })

  it('takes the open end when the other is blocked', () => {
    expect(answers(shotsOf([[44, 'hit'], [45, 'hit'], [46, 'miss']]))).toEqual(new Set([43]))
  })

  it('does not wrap rows at the board edge', () => {
    expect(answers(shotsOf([[9, 'hit']]))).toEqual(new Set([8, 19]))
    expect(answers(shotsOf([[10, 'hit']]))).toEqual(new Set([0, 11, 20]))
  })

  it('treats sunk cells as done and goes back to hunting', () => {
    for (const cell of answers(shotsOf([[44, 'sunk'], [45, 'sunk']]))) expect(parity(cell)).toBe(0)
  })

  it('throws once the board is exhausted', () => {
    const full = shotsOf(Array.from({ length: 100 }, (_, c): [Cell, ShotResult] => [c, 'miss']))
    expect(() => huntTarget(full)).toThrow()
  })

  it('finishes every simulated game and beats the random bot by a wide margin', () => {
    // measured over these seeds: medium ≈ 51, random ≈ 95
    const medium = average(huntTarget)
    const random = average(randomShot)
    expect(medium).toBeLessThan(60)
    expect(random - medium).toBeGreaterThan(30)
  })
})
