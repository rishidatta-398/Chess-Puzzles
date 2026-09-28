import { useEffect, useMemo, useState } from 'react'
import { PlayableBoard } from './PlayableBoard'
import { MoveList } from './MoveList'
import { EvalBar } from './EvalBar'
import { ReviewPanel } from './ReviewPanel'
import { useGameReview } from './useGameReview'
import { KIND_LABEL, KIND_SYMBOL } from '../engine/review'
import { displayName, gameEnding, gameFrames, resultText, type Game } from '../lib/games'

type Props = {
  game: Game
  /** Which side faces the viewer at the start. */
  orientation?: 'white' | 'black'
  /** Extra content under the move list (notes, info). */
  children?: React.ReactNode
}

/** Replay a game move by move: board, arrows, keyboard, clickable move list. */
export function GameViewer({ game, orientation = 'white', children }: Props) {
  const frames = useMemo(() => gameFrames(game), [game])
  const ending = useMemo(() => gameEnding(game), [game])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [gameId, setGameId] = useState(game.id)
  const { review, progress, error, start, cancel } = useGameReview(game.id, frames)

  // Start from the beginning when a different game is opened.
  if (gameId !== game.id) {
    setGameId(game.id)
    setIdx(0)
    setFlipped(false)
  }

  const last = frames.length - 1
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      const moves: Record<string, (i: number) => number> = {
        ArrowLeft: (i) => Math.max(i - 1, 0),
        ArrowRight: (i) => Math.min(i + 1, last),
        Home: () => 0,
        End: () => last,
        ArrowUp: () => 0,
        ArrowDown: () => last,
      }
      const f = moves[e.key]
      if (f) {
        e.preventDefault()
        setIdx(f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const frame = frames[idx]
  const side = flipped ? (orientation === 'white' ? 'black' : 'white') : orientation
  const moveNo = idx === 0 ? 'Start' : `Move ${Math.ceil(idx / 2)}${idx % 2 ? '' : '…'} of ${Math.ceil(last / 2)}`
  const blackStarts = frames[0].fen.split(' ')[1] === 'b'

  // Engine review for the move just played (the one that led to this position).
  const mv = review && idx > 0 ? review.moves[idx - 1] : null
  const showBest = mv && mv.bestUci && !['best', 'great', 'brilliant'].includes(mv.kind)
  const arrows = review
    ? showBest
      ? [{ startSquare: mv!.bestUci!.slice(0, 2), endSquare: mv!.bestUci!.slice(2, 4), color: 'rgba(40, 160, 70, 0.8)' }]
      : []
    : undefined
  const marks = review
    ? review.moves.map((m) =>
        ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder'].includes(m.kind)
          ? { symbol: KIND_SYMBOL[m.kind], kind: m.kind, title: KIND_LABEL[m.kind] }
          : null,
      )
    : undefined
  const sanLabel = idx > 0 ? `${Math.ceil(idx / 2)}${(idx + (blackStarts ? 1 : 0)) % 2 ? '.' : '...'} ${frame.san}` : ''

  return (
    <div className="layout">
      <section className="board-col">
        <div className="board-row">
          {review && <EvalBar score={review.evals[idx] ?? null} flipped={side === 'black'} />}
          <PlayableBoard
            fen={frame.fen}
            orientation={side}
            onMove={() => false}
            lastMove={frame.move}
            interactive={false}
            arrows={arrows}
          />
        </div>
        <div className="viewer-controls">
          <button onClick={() => setIdx(0)} disabled={idx === 0} aria-label="Start">
            ⏮
          </button>
          <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0} aria-label="Previous move">
            ←
          </button>
          <span className="dim small viewer-pos">{moveNo}</span>
          <button onClick={() => setIdx((i) => Math.min(i + 1, last))} disabled={idx === last} aria-label="Next move">
            →
          </button>
          <button onClick={() => setIdx(last)} disabled={idx === last} aria-label="End">
            ⏭
          </button>
          <button onClick={() => setFlipped((f) => !f)} aria-label="Flip board">
            ⇅
          </button>
        </div>
        {idx === last && (
          <p className="status game-end" aria-live="polite">
            {resultText(game.r)} · {ending}
          </p>
        )}
      </section>

      <aside className="panel">
        {children}
        <ReviewPanel
          review={review}
          progress={progress}
          error={error}
          onStart={start}
          onCancel={cancel}
          moveIndex={idx - 1}
          moveLabel={sanLabel}
          whiteName={displayName(game.w)}
          blackName={displayName(game.b)}
          onJump={(i) => setIdx(i + 1)}
          blackStarts={blackStarts}
        />
        <h2>Moves</h2>
        <MoveList
          sans={frames.slice(1).map((f) => f.san ?? '')}
          startFen={frames[0].fen}
          current={idx - 1}
          onSelect={(i) => setIdx(i + 1)}
          marks={marks}
          footer={
            <button type="button" className="end-link" onClick={() => setIdx(last)}>
              <b>{resultText(game.r)}</b> <span className="dim">{ending}</span>
            </button>
          }
        />
        <p className="dim small">Use ← → to step, ↑ ↓ (or Home/End) to jump to the start or end.</p>
      </aside>
    </div>
  )
}
