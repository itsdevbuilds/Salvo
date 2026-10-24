import { type PointerEvent } from 'react'
import { cellName } from './game/engine'
import { BOARD_SIZE, CELL_COUNT, type Board, type Cell } from './game/types'

type Props = {
  board: Board
  id: 'player' | 'enemy'
  label: string
  showShips: boolean
  preview?: { cells: readonly Cell[]; valid: boolean } | null
  onFire?: (cell: Cell) => void
  // e is missing for keyboard / screen-reader activation
  onCellDown?: (cell: Cell, e?: PointerEvent<HTMLElement>) => void
}

// showShips must stay false for the enemy board until game over, so ship positions never reach the DOM
export function Grid({ board, id, label, showShips, preview, onFire, onCellDown }: Props) {
  const shipAt = new Set(board.ships.flatMap((s) => s.cells))
  // Map keeps insertion order and fire() only appends the new cell, so the last key is the latest shot
  const last = [...board.shots.keys()].at(-1)
  return (
    <section className="board">
      <h2>{label}</h2>
      <div
        className={`grid grid-${id}${onCellDown ? ' grid-drag' : ''}`}
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      >
        {Array.from({ length: CELL_COUNT }, (_, cell) => {
          const shot = board.shots.get(cell)
          const ship = showShips && shipAt.has(cell)
          const inPreview = preview?.cells.includes(cell)
          const classes = ['cell', ship && 'ship', shot, cell === last && 'last', inPreview && (preview!.valid ? 'preview' : 'invalid')]
          return (
            <button
              key={cell}
              type="button"
              data-board={id}
              data-cell={cell}
              className={classes.filter(Boolean).join(' ')}
              aria-label={`${cellName(cell)}${shot ? `, ${shot}` : ship ? ', ship' : ''}`}
              // a shot cell is only aria-disabled, so the cell you just fired keeps keyboard focus (the reducer ignores repeats)
              disabled={!onFire && !onCellDown}
              aria-disabled={onFire && shot ? true : undefined}
              // detail 0 = keyboard/AT click; pointer clicks were already handled on pointerdown
              onClick={onFire ? () => onFire(cell) : onCellDown && ((e) => e.detail === 0 && onCellDown(cell))}
              onPointerDown={onCellDown && ((e) => e.button === 0 && onCellDown(cell, e))}
            />
          )
        })}
      </div>
    </section>
  )
}
