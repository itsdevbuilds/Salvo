import { useReducer, useState, type PointerEvent } from 'react'
import { Grid } from './Grid.tsx'
import { colOf, rowOf, toCell, unplaced } from './game/engine'
import { gameReducer, initialState, placementCells } from './game/reducer'
import { FLEET, type Cell, type Orientation } from './game/types'

// the player-grid cell under a screen point (works during touch drags, where the pressed element holds capture)
function playerCellAt(x: number, y: number): Cell | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-board="player"]')
  return el ? Number(el.dataset.cell) : null
}

// origin that keeps the grabbed segment (offset cells from the head) under the pointer; -1 (off-board) if the head would leave the grid
function originFor(cell: Cell, offset: number, orientation: Orientation): Cell {
  const row = rowOf(cell) - (orientation === 'v' ? offset : 0)
  const col = colOf(cell) - (orientation === 'h' ? offset : 0)
  return row < 0 || col < 0 ? -1 : toCell(row, col)
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
  const [hover, setHover] = useState<Cell | null>(null)
  // from: the cell a placed ship was picked up at, so a plain tap on it doesn't move it; offset: grabbed segment
  const [drag, setDrag] = useState<{ from: Cell | null; offset: number } | null>(null)
  const placing = state.phase === 'placing'

  let preview = null
  if (placing && hover !== null && state.selected) {
    const cells = placementCells(state, drag ? originFor(hover, drag.offset, state.orientation) : hover)
    preview = cells ? { cells, valid: true } : { cells: [hover], valid: false }
  }

  function onPointerMove(e: PointerEvent) {
    if (placing) setHover(playerCellAt(e.clientX, e.clientY))
  }

  function onPointerUp(e: PointerEvent) {
    if (drag) {
      const cell = playerCellAt(e.clientX, e.clientY)
      if (cell !== null && cell !== drag.from)
        dispatch({ type: 'place', origin: originFor(cell, drag.offset, state.orientation) })
      setDrag(null)
    }
    if (e.pointerType !== 'mouse') setHover(null)
  }

  function grab(e: PointerEvent<HTMLElement>, from: Cell | null, offset: number) {
    // capture so pointerup/pointercancel still reach <main> when released off it
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ from, offset })
  }

  // pointer press or keyboard activation (no e): select a placed ship, else place the selected one there
  function onCellDown(cell: Cell, e?: PointerEvent<HTMLElement>) {
    const ship = state.player.ships.find((s) => s.cells.includes(cell))
    if (!ship) return dispatch({ type: 'place', origin: cell })
    dispatch({ type: 'select', ship: ship.type })
    if (e) grab(e, cell, ship.cells.indexOf(cell))
  }

  return (
    <main
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setDrag(null)
        setHover(null)
      }}
      onPointerLeave={() => setHover(null)}
    >
      <h1>Salvo</h1>
      <p role="status">{state.message}</p>

      {placing && (
        <>
          <p className="hint">Drag or tap ships onto your grid. Drag a placed ship to move it, or select it and press Rotate.</p>
          <div className="tray">
            {unplaced(state.player).map(({ type, length }) => (
              <button
                key={type}
                type="button"
                className="tray-ship"
                aria-pressed={state.selected === type}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  dispatch({ type: 'select', ship: type })
                  grab(e, null, 0)
                }}
                onClick={() => dispatch({ type: 'select', ship: type })}
              >
                <span className="ship-name">{type}</span>
                <span className="ship-len" aria-hidden="true">
                  {'■'.repeat(length)}
                </span>
              </button>
            ))}
          </div>
          <div className="controls">
            <button type="button" aria-pressed={state.orientation === 'v'} onClick={() => dispatch({ type: 'rotate' })}>
              Rotate ({state.orientation === 'h' ? 'horizontal' : 'vertical'})
            </button>
            <button type="button" onClick={() => dispatch({ type: 'randomize' })}>
              Randomize
            </button>
            <button
              type="button"
              className="primary"
              disabled={state.player.ships.length !== FLEET.length}
              onClick={() => dispatch({ type: 'start' })}
            >
              Start
            </button>
          </div>
        </>
      )}

      <div className="boards">
        <Grid
          board={state.player}
          id="player"
          label="Your fleet"
          showShips
          preview={preview}
          onCellDown={placing ? onCellDown : undefined}
        />
        {!placing && (
          <Grid
            board={state.enemy}
            id="enemy"
            label="Enemy waters"
            showShips={state.phase === 'over'}
            onFire={state.phase === 'playing' ? (cell) => dispatch({ type: 'fire', cell }) : undefined}
          />
        )}
      </div>

      {state.phase === 'over' && (
        <div className="controls">
          <button type="button" className="primary" onClick={() => dispatch({ type: 'reset' })}>
            Play again
          </button>
        </div>
      )}
    </main>
  )
}
