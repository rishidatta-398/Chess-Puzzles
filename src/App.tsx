import { useState } from 'react'
import { Chess } from 'chess.js'
import { PlayableBoard } from './components/PlayableBoard'
import { statusText, tryMove } from './lib/chessUtils'
import './App.css'

const START_FEN = new Chess().fen()

type Ply = { fen: string; san: string; from: string; to: string }

export default function App() {
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
    const text = fenInput.trim()
    try {
      const game = new Chess(text)
      setStartFen(game.fen())
      setHistory([])
      setFenError('')
      setOrientation(game.turn() === 'w' ? 'white' : 'black')
    } catch {
      setFenError('That FEN is not valid.')
    }
  }

  function reset() {
    setStartFen(START_FEN)
    setHistory([])
    setOrientation('white')
  }

  // Pair up moves for the move list: 1. e4 e5  2. Nf3 ...
  const blackStarts = startFen.split(' ')[1] === 'b'
  const firstNumber = Number(startFen.split(' ')[5]) || 1
  const rows: { n: number; white?: string; black?: string }[] = []
  history.forEach((ply, i) => {
    const idx = i + (blackStarts ? 1 : 0)
    const row = Math.floor(idx / 2)
    rows[row] ??= { n: firstNumber + row }
    if (idx % 2 === 0) rows[row].white = ply.san
    else rows[row].black = ply.san
  })

  return (
    <div className="app">
      <header className="top">
        <h1>Chess Puzzles</h1>
        <span className="phase">Phase 0 · board sandbox</span>
      </header>

      <main className="layout">
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
            <button onClick={reset}>Reset</button>
          </div>

          <h2>Moves</h2>
          <ol className="moves">
            {rows.length === 0 && <li className="empty">No moves yet. Drag a piece or click one, then click a square.</li>}
            {rows.map((r) => (
              <li key={r.n}>
                <span className="num">{r.n}.</span>
                <span>{r.white ?? '…'}</span>
                <span>{r.black ?? ''}</span>
              </li>
            ))}
          </ol>

          <h2>Load a position</h2>
          <div className="fen">
            <input
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              placeholder="Paste a FEN"
              aria-label="FEN"
            />
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
      </main>
    </div>
  )
}
