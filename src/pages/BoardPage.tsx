import { useState } from 'react'
import { Chess } from 'chess.js'
import { PlayableBoard } from '../components/PlayableBoard'
import { MoveList } from '../components/MoveList'
import { statusText, tryMove } from '../lib/chessUtils'

const START_FEN = new Chess().fen()

type Ply = { fen: string; san: string; from: string; to: string }

/** Free play / analysis board (the Phase 0 sandbox). */
export function BoardPage() {
  const [startFen, setStartFen] = useState(START_FEN)
  const [history, setHistory] = useState<Ply[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState('')

  const current = history.length ? history[history.length - 1] : null
  const fen = current ? current.fen : startFen

  function handleMove(from: string, to: string) {
    const result = tryMove(fen, from, to)
    if (!result) return false
    setHistory((h) => [...h, result])
    return true
  }

  function loadFen() {
    try {
      const game = new Chess(fenInput.trim())
      setStartFen(game.fen())
      setHistory([])
      setFenError('')
      setOrientation(game.turn() === 'w' ? 'white' : 'black')
    } catch {
      setFenError('That FEN is not valid.')
    }
  }

  return (
    <div className="layout">
      <section className="board-col">
        <PlayableBoard
          fen={fen}
          orientation={orientation}
          onMove={handleMove}
          lastMove={current ? { from: current.from, to: current.to } : null}
        />
        <p className="status" aria-live="polite">{statusText(fen)}</p>
      </section>

      <aside className="panel">
        <div className="buttons">
          <button onClick={() => setHistory((h) => h.slice(0, -1))} disabled={!history.length}>
            Undo
          </button>
          <button onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>Flip board</button>
          <button
            onClick={() => {
              setStartFen(START_FEN)
              setHistory([])
              setOrientation('white')
            }}
          >
            Reset
          </button>
        </div>

        <h2>Moves</h2>
        <MoveList
          sans={history.map((p) => p.san)}
          startFen={startFen}
          current={history.length - 1}
          emptyText="No moves yet. Drag a piece or click one, then click a square."
        />

        <h2>Load a position</h2>
        <div className="fen">
          <input value={fenInput} onChange={(e) => setFenInput(e.target.value)} placeholder="Paste a FEN" aria-label="FEN" />
          <button onClick={loadFen} disabled={!fenInput.trim()}>
            Load
          </button>
        </div>
        {fenError && <p className="error">{fenError}</p>}
        <p className="fen-now">
          <span>Current FEN</span>
          <code>{fen}</code>
        </p>
      </aside>
    </div>
  )
}
