import { useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'
import { legalTargets } from '../lib/chessUtils'

type Props = {
  fen: string
  orientation: 'white' | 'black'
  /** Called when the user makes a move. Return true if it was accepted. */
  onMove: (from: string, to: string) => boolean
  lastMove?: { from: string; to: string } | null
  /** Set false to lock the board (e.g. while the opponent is replying). */
  interactive?: boolean
}

const COLORS = {
  light: '#eeeed2',
  dark: '#769656',
  selected: 'rgba(255, 255, 0, 0.45)',
  lastMove: 'rgba(255, 213, 0, 0.35)',
  check: 'radial-gradient(circle, rgba(230,40,40,0.9) 0%, rgba(230,40,40,0.35) 55%, transparent 75%)',
  dot: 'radial-gradient(circle, rgba(0,0,0,0.22) 22%, transparent 24%)',
  ring: 'radial-gradient(circle, transparent 62%, rgba(0,0,0,0.22) 64%)',
}

export function PlayableBoard({ fen, orientation, onMove, lastMove, interactive = true }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedFen, setSelectedFen] = useState(fen)

  // Drop the selection whenever the position changes from outside.
  if (selectedFen !== fen) {
    setSelectedFen(fen)
    setSelected(null)
  }

  const targets = useMemo(() => (selected ? legalTargets(fen, selected) : []), [fen, selected])

  const squareStyles = useMemo(() => {
    const game = new Chess(fen)
    const styles: Record<string, CSSProperties> = {}
    if (lastMove) {
      styles[lastMove.from] = { background: COLORS.lastMove }
      styles[lastMove.to] = { background: COLORS.lastMove }
    }
    if (game.inCheck()) {
      const king = game
        .board()
        .flat()
        .find((p) => p && p.type === 'k' && p.color === game.turn())
      if (king) styles[king.square] = { background: COLORS.check }
    }
    if (selected) styles[selected] = { background: COLORS.selected }
    for (const t of targets) {
      const occupied = game.get(t as Square)
      styles[t] = { ...styles[t], backgroundImage: occupied ? COLORS.ring : COLORS.dot }
    }
    return styles
  }, [fen, lastMove, selected, targets])

  function attempt(from: string, to: string): boolean {
    const ok = onMove(from, to)
    setSelected(null)
    return ok
  }

  function handleSquareClick({ square }: { square: string }) {
    if (!interactive) return
    if (selected && targets.includes(square as Square)) {
      attempt(selected, square)
      return
    }
    // Select a piece of the side to move, or clear the selection.
    const own = legalTargets(fen, square).length > 0
    setSelected(own && square !== selected ? square : null)
  }

  function handleDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
    if (!interactive || !targetSquare || sourceSquare === targetSquare) return false
    return attempt(sourceSquare, targetSquare)
  }

  return (
    <div className="board-wrap">
      <Chessboard
        options={{
          id: 'main-board',
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive,
          squareStyles,
          lightSquareStyle: { backgroundColor: COLORS.light },
          darkSquareStyle: { backgroundColor: COLORS.dark },
          animationDurationInMs: 180,
          onSquareClick: handleSquareClick,
          onPieceDrop: handleDrop,
          canDragPiece: ({ square }) => interactive && !!square && legalTargets(fen, square).length > 0,
        }}
      />
    </div>
  )
}
