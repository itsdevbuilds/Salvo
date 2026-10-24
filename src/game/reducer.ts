import { huntTarget } from './bot'
import {
  allSunk,
  canPlace,
  cellName,
  emptyBoard,
  fire,
  inRange,
  isShot,
  randomFleet,
  shipCells,
  shipLength,
  unplaced,
  type FireOutcome,
} from './engine'
import { FLEET, type Board, type Cell, type Orientation, type Ship, type ShipType } from './types'

export type Phase = 'placing' | 'playing' | 'over'

export type GameState = {
  phase: Phase
  player: Board
  enemy: Board
  orientation: Orientation
  selected: ShipType | null
  winner: 'player' | 'bot' | null
  message: string
}

export type Action =
  | { type: 'select'; ship: ShipType }
  | { type: 'rotate' }
  | { type: 'place'; origin: Cell }
  | { type: 'randomize'; rng?: () => number }
  | { type: 'start'; rng?: () => number }
  | { type: 'fire'; cell: Cell; rng?: () => number }
  | { type: 'reset' }

export const initialState = (): GameState => ({
  phase: 'placing',
  player: emptyBoard(),
  enemy: emptyBoard(),
  orientation: 'h',
  selected: FLEET[0].type,
  winner: null,
  message: PLACE_MSG,
})

const PLACE_MSG = 'Place your fleet.'
const orientationOf = (ship: Ship): Orientation => (ship.cells[1] - ship.cells[0] === 1 ? 'h' : 'v')

// cells the selected ship would occupy at origin, or null if off-board/overlapping (ignores its own current spot)
export function placementCells(state: GameState, origin: Cell): Cell[] | null {
  if (!state.selected) return null
  const cells = shipCells(origin, shipLength(state.selected), state.orientation)
  const others = state.player.ships.filter((s) => s.type !== state.selected)
  return cells && canPlace(others, cells) ? cells : null
}

function report(who: 'You' | 'Bot', cell: Cell, { result, sunk }: FireOutcome) {
  if (result === 'miss') return `${who} missed at ${cellName(cell)}.`
  if (result === 'hit') return `${who} hit at ${cellName(cell)}!`
  return `${who} sank ${who === 'You' ? 'their' : 'your'} ${sunk}!`
}

// invalid actions (misclicks, wrong phase) return the same state; never throws on user input
export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'select': {
      if (state.phase !== 'placing') return state
      // picking up a placed ship keeps its orientation, so dragging it doesn't turn it
      const ship = state.player.ships.find((s) => s.type === action.ship)
      return { ...state, selected: action.ship, orientation: ship ? orientationOf(ship) : state.orientation }
    }
    case 'rotate': {
      if (state.phase !== 'placing') return state
      const rotated = { ...state, orientation: state.orientation === 'h' ? 'v' : 'h' } satisfies GameState
      // a selected ship that is already placed turns in place around its first cell
      const ship = state.player.ships.find((s) => s.type === state.selected)
      if (!ship) return rotated
      const cells = placementCells(rotated, ship.cells[0])
      if (!cells) return { ...state, message: `No room to turn the ${ship.type} there.` }
      const ships = state.player.ships.map((s) => (s === ship ? { ...s, cells } : s))
      return { ...rotated, player: { ...state.player, ships }, message: PLACE_MSG }
    }
    case 'place': {
      const cells = state.phase === 'placing' ? placementCells(state, action.origin) : null
      if (!cells || !state.selected) return state
      const ships = [...state.player.ships.filter((s) => s.type !== state.selected), { type: state.selected, cells }]
      const player = { ...state.player, ships }
      return { ...state, player, selected: unplaced(player)[0]?.type ?? null, message: PLACE_MSG }
    }
    case 'randomize':
      if (state.phase !== 'placing') return state
      return { ...state, player: { ships: randomFleet(action.rng), shots: new Map() }, selected: null }
    case 'start':
      if (state.phase !== 'placing' || state.player.ships.length !== FLEET.length) return state
      return {
        ...state,
        phase: 'playing',
        enemy: { ships: randomFleet(action.rng), shots: new Map() },
        selected: null,
        message: 'Fire at the enemy grid.',
      }
    case 'fire': {
      if (state.phase !== 'playing' || !inRange(action.cell) || isShot(state.enemy, action.cell)) return state
      const shot = fire(state.enemy, action.cell)
      if (allSunk(shot.board))
        return { ...state, enemy: shot.board, phase: 'over', winner: 'player', message: 'You sank their whole fleet. You win!' }
      const target = huntTarget(state.player.shots, action.rng)
      const reply = fire(state.player, target)
      const lost = allSunk(reply.board)
      return {
        ...state,
        enemy: shot.board,
        player: reply.board,
        phase: lost ? 'over' : 'playing',
        winner: lost ? 'bot' : null,
        message: lost
          ? 'The bot sank your whole fleet. You lose.'
          : `${report('You', action.cell, shot)} ${report('Bot', target, reply)}`,
      }
    }
    case 'reset':
      return initialState()
  }
}
