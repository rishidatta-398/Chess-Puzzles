import { useState } from 'react'
import { KIND_LABEL, KIND_SYMBOL, type MoveKind } from '../engine/review'
import type { GameReview, ReviewProgress } from '../engine/gameReview'
import { DEPTHS, type DepthName } from './useGameReview'

const ORDER: MoveKind[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']

type Props = {
  review: GameReview | null
  progress: ReviewProgress | null
  error: string
  onStart: (d: DepthName) => void
  onCancel: () => void
  /** Index of the move being shown (-1 = start position). */
  moveIndex: number
  moveLabel: string
  whiteName: string
  blackName: string
  /** Jump to a move by index. */
  onJump: (moveIndex: number) => void
  /** True if the game starts with Black to move (custom positions). */
  blackStarts?: boolean
}

/** The coach: runs the review, then explains the move on the board. */
export function ReviewPanel(p: Props) {
  const [depth, setDepth] = useState<DepthName>('standard')

  if (p.progress) {
    const pct = Math.round((p.progress.done / Math.max(1, p.progress.total)) * 100)
    return (
      <div className="card review">
        <p className="review-title">Stockfish is reviewing the game…</p>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="dim small">
          Position {p.progress.done} of {p.progress.total}. You can keep browsing the moves.
        </p>
        <button onClick={p.onCancel}>Stop</button>
      </div>
    )
  }

  if (!p.review) {
    return (
      <div className="card review">
        <p className="review-title">Review with Stockfish</p>
        <p className="dim small">
          Grades every move (brilliant, best, mistake, blunder…) and explains why. Takes about a minute for a long game, and
          the result is saved so it’s instant next time.
        </p>
        <div className="buttons">
          <select value={depth} onChange={(e) => setDepth(e.target.value as DepthName)} aria-label="Depth">
            <option value="quick">Quick (depth {DEPTHS.quick})</option>
            <option value="standard">Standard (depth {DEPTHS.standard})</option>
            <option value="deep">Deep (depth {DEPTHS.deep}, slower)</option>
          </select>
          <button className="primary" onClick={() => p.onStart(depth)}>
            Review game
          </button>
        </div>
        {p.error && <p className="error">{p.error}</p>}
      </div>
    )
  }

  const r = p.review
  const mv = p.moveIndex >= 0 ? r.moves[p.moveIndex] : null

  const jumpTo = (side: 0 | 1, kind: MoveKind) => {
    // Next move of this kind for this side after the current one, wrapping around.
    const offset = p.blackStarts ? 1 : 0
    const idxs = r.moves.map((m, i) => ((i + offset) % 2 === side && m.kind === kind ? i : -1)).filter((i) => i >= 0)
    if (!idxs.length) return
    p.onJump(idxs.find((i) => i > p.moveIndex) ?? idxs[0])
  }

  return (
    <div className="card review">
      {mv ? (
        <>
          <p className="review-title">
            <span className={`kind-pill kind-${mv.kind}`}>
              {KIND_SYMBOL[mv.kind]} {KIND_LABEL[mv.kind]}
            </span>{' '}
            <span className="dim small">{p.moveLabel}</span>
          </p>
          <p className="why">{mv.why}</p>
          {mv.bestSan && !['best', 'great', 'brilliant'].includes(mv.kind) && (
            <p className="dim small">
              Best was <b className="best-move">{mv.bestSan}</b> (green arrow)
              {mv.bestLine.length > 1 && <> · line: {mv.bestLine.slice(0, 6).join(' ')}</>}
            </p>
          )}
          <p className="dim small">
            Winning chances: {Math.round(mv.winBefore)}% → {Math.round(mv.winAfter)}% · Eval after: {mv.evalAfter}
          </p>
        </>
      ) : (
        <p className="review-title">Game review</p>
      )}

      <table className="summary">
        <thead>
          <tr>
            <th />
            <th title={p.whiteName}>White</th>
            <th title={p.blackName}>Black</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Accuracy</td>
            <td>
              <b>{r.white.accuracy.toFixed(1)}</b>
            </td>
            <td>
              <b>{r.black.accuracy.toFixed(1)}</b>
            </td>
          </tr>
          {ORDER.map((k) => (
            <tr key={k}>
              <td>
                <span className={`mark mark-${k}`}>{KIND_SYMBOL[k]}</span> {KIND_LABEL[k]}
              </td>
              {([0, 1] as const).map((side) => {
                const n = (side === 0 ? r.white : r.black).counts[k]
                return (
                  <td key={side}>
                    {n ? (
                      <button className="count" onClick={() => jumpTo(side, k)} title="Jump to the next one">
                        {n}
                      </button>
                    ) : (
                      <span className="dim">0</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dim small">Stockfish 19 lite, depth {r.depth}. Click a number to jump to those moves.</p>
    </div>
  )
}
