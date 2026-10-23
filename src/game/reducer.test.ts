import { describe, it, expect } from 'vitest'
import { toCell } from './engine'
import { gameReducer, initialState, type Action, type GameState } from './reducer'
import { seeded } from './test-utils'

const run = (state: GameState, ...actions: Action[]) => actions.reduce(gameReducer, state)

// whole fleet, one ship per row starting at column 0
const placedFleet = () =>
  run(initialState(), ...[0, 1, 2, 3, 4].map((row): Action => ({ type: 'place', origin: toCell(row, 0) })))

const playing = () => run(placedFleet(), { type: 'start', rng: seeded(2) })

describe('initialState', () => {
  it('starts placing with the carrier selected and no ships', () => {
    const state = initialState()
    expect(state.phase).toBe('placing')
    expect(state.selected).toBe('carrier')
    expect(state.player.ships).toHaveLength(0)
  })
})

describe('place', () => {
  it('places the selected ship and selects the next one', () => {
    const state = run(initialState(), { type: 'place', origin: 0 })
    expect(state.player.ships).toEqual([{ type: 'carrier', cells: [0, 1, 2, 3, 4] }])
    expect(state.selected).toBe('battleship')
  })

  it('ignores off-board placements', () => {
    const state = initialState()
    expect(gameReducer(state, { type: 'place', origin: toCell(0, 8) })).toBe(state)
  })

  it('ignores overlapping placements', () => {
    const state = run(initialState(), { type: 'place', origin: 0 })
    expect(gameReducer(state, { type: 'place', origin: 2 })).toBe(state)
  })

  it('moves a ship that is already placed', () => {
    const state = run(initialState(), { type: 'place', origin: 0 }, { type: 'select', ship: 'carrier' }, { type: 'place', origin: 50 })
    expect(state.player.ships).toEqual([{ type: 'carrier', cells: [50, 51, 52, 53, 54] }])
  })

  it('can move a ship onto cells it already covers', () => {
    const state = run(initialState(), { type: 'place', origin: 0 }, { type: 'select', ship: 'carrier' }, { type: 'place', origin: 1 })
    expect(state.player.ships[0].cells).toEqual([1, 2, 3, 4, 5])
  })

  it('selects nothing once the whole fleet is placed', () => {
    const state = placedFleet()
    expect(state.player.ships).toHaveLength(5)
    expect(state.selected).toBeNull()
  })
})

describe('rotate', () => {
  it('makes the next placement vertical', () => {
    const state = run(initialState(), { type: 'rotate' }, { type: 'place', origin: 0 })
    expect(state.player.ships[0].cells).toEqual([0, 10, 20, 30, 40])
  })

  it('turns a selected placed ship in place', () => {
    const state = run(initialState(), { type: 'place', origin: 0 }, { type: 'select', ship: 'carrier' }, { type: 'rotate' })
    expect(state.player.ships[0].cells).toEqual([0, 10, 20, 30, 40])
    expect(state.selected).toBe('carrier')
    expect(state.orientation).toBe('v')
  })

  it('leaves a placed ship alone when there is no room to turn it', () => {
    const state = run(initialState(), { type: 'place', origin: toCell(9, 0) }, { type: 'select', ship: 'carrier' })
    const next = gameReducer(state, { type: 'rotate' })
    expect(next.player).toBe(state.player)
    expect(next.orientation).toBe('h')
    expect(next.message).toMatch(/no room/i)
  })
})

describe('select', () => {
  it('adopts the orientation of a placed ship', () => {
    const state = run(initialState(), { type: 'rotate' }, { type: 'place', origin: 0 }, { type: 'rotate' }, { type: 'select', ship: 'carrier' })
    expect(state.orientation).toBe('v')
  })
})

describe('randomize', () => {
  it('places a full fleet', () => {
    const state = run(initialState(), { type: 'randomize', rng: seeded(1) })
    expect(state.player.ships).toHaveLength(5)
    expect(state.selected).toBeNull()
  })
})

describe('start', () => {
  it('is ignored until the whole fleet is placed', () => {
    const state = run(initialState(), { type: 'place', origin: 0 })
    expect(gameReducer(state, { type: 'start' })).toBe(state)
  })

  it('starts play against a full enemy fleet', () => {
    const state = playing()
    expect(state.phase).toBe('playing')
    expect(state.enemy.ships).toHaveLength(5)
  })
})

describe('fire', () => {
  it('records one shot each for player and bot', () => {
    const state = run(playing(), { type: 'fire', cell: 99, rng: seeded(3) })
    expect(state.enemy.shots.size).toBe(1)
    expect(state.player.shots.size).toBe(1)
    expect(state.message).toMatch(/^You .* Bot /)
  })

  it('ignores cells off the board', () => {
    const state = playing()
    for (const cell of [-1, 100, 1.5, NaN]) expect(gameReducer(state, { type: 'fire', cell })).toBe(state)
  })

  it('ignores a repeat shot', () => {
    const state = run(playing(), { type: 'fire', cell: 99, rng: seeded(3) })
    expect(gameReducer(state, { type: 'fire', cell: 99 })).toBe(state)
  })

  it('is ignored before the game starts', () => {
    const state = placedFleet()
    expect(gameReducer(state, { type: 'fire', cell: 0 })).toBe(state)
  })

  it('plays a full game to a winner without the bot repeating a shot', () => {
    let state = run(initialState(), { type: 'randomize', rng: seeded(1) }, { type: 'start', rng: seeded(2) })
    const rng = seeded(3)
    for (let cell = 0; state.phase === 'playing'; cell++) state = gameReducer(state, { type: 'fire', cell, rng })
    expect(state.phase).toBe('over')
    expect(state.winner).not.toBeNull()
    const turns = state.enemy.shots.size
    expect(state.player.shots.size).toBe(state.winner === 'player' ? turns - 1 : turns)
  })
})

describe('reset', () => {
  it('returns to a fresh placement phase', () => {
    const state = run(playing(), { type: 'fire', cell: 0, rng: seeded(3) }, { type: 'reset' })
    expect(state).toEqual(initialState())
  })
})
