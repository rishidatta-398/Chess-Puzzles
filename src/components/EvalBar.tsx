import { formatEval, winPct } from '../engine/review'
import type { Score } from '../engine/uci'

/** Vertical bar showing who's better: white fills from the bottom (flipped if Black is at the bottom). */
export function EvalBar({ score, flipped = false }: { score: Score | null; flipped?: boolean }) {
  const white = score ? winPct(score) : 50
  const label = score ? formatEval(score, 'w') : ''
  return (
    <div className={`eval-bar${flipped ? ' flipped' : ''}`} aria-label={`Evaluation ${label}`} title={label}>
      <div className="eval-white" style={{ height: `${white}%` }} />
      <span className={`eval-label ${white >= 50 ? 'on-white' : 'on-black'}`}>{label.replace('+', '')}</span>
    </div>
  )
}
