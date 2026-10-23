import { describe, it, expect } from 'vitest'
import { randomShot } from './bot'
import { seeded } from './test-utils'
import { type Cell, type ShotResult } from './types'

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
