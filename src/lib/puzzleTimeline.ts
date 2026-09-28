import { playUciLine, type PreparedPuzzle } from './puzzles'

/** One position in a puzzle's history. */
export type Frame = {
  fen: string
  /** Move that led here (null for the very first position). */
  move: { from: string; to: string } | null
  san: string | null
}

/**
 * Every position in a puzzle, in order:
 * [0] before the opponent's setup move, [1] after it (where solving starts),
 * then one frame per solution move.
 */
export function buildTimeline(p: PreparedPuzzle): Frame[] {
  const line = playUciLine(p.startFen, p.solution)
  return [
    { fen: p.puzzle.fen, move: null, san: null },
    { fen: p.startFen, move: { from: p.setupMove.from, to: p.setupMove.to }, san: p.setupMove.san },
    ...line.map((m) => ({ fen: m.fen, move: { from: m.from, to: m.to }, san: m.san })),
  ]
}

/**
 * The newest frame the player may look at.
 * While solving: only positions already reached (no peeking ahead).
 * After finishing: the whole solution.
 */
export function lastViewable(timeline: Frame[], ply: number, finished: boolean): number {
  return finished ? timeline.length - 1 : Math.min(1 + ply, timeline.length - 1)
}

/** Step back/forward from `view` (null = live, i.e. the newest viewable frame). */
export function step(view: number | null, delta: -1 | 1, last: number): number | null {
  const at = view ?? last
  const next = Math.min(Math.max(at + delta, 0), last)
  return next === last ? null : next
}
