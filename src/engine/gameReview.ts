import { Chess } from 'chess.js'
import type { Engine } from './engine'
import { negate, reviewMove, sacrificeCheck, summarize, type MoveReview, type SideSummary } from './review'
import type { Score } from './uci'
import type { Frame } from '../lib/puzzleTimeline'

export type GameReview = {
  depth: number
  /** One review per move (index i = the move that led to frame i+1). */
  moves: MoveReview[]
  /** Engine score for every position, from White's point of view (frame index). */
  evals: Score[]
  white: SideSummary
  black: SideSummary
}

export type ReviewProgress = { done: number; total: number }

/** Run the whole game through the engine and grade every move. */
export async function reviewGame(
  engine: Engine,
  frames: Frame[],
  { depth = 13, onProgress }: { depth?: number; onProgress?: (p: ReviewProgress) => void } = {},
): Promise<GameReview> {
  const total = frames.length
  const analyses = []
  for (let i = 0; i < frames.length; i++) {
    onProgress?.({ done: i, total })
    analyses.push(await engine.analyze(frames[i].fen, { depth, multipv: 3 }))
  }
  onProgress?.({ done: total, total })

  const moves: MoveReview[] = []
  for (let i = 0; i < frames.length - 1; i++) {
    const c = new Chess(frames[i].fen)
    const m = c.move(frames[i + 1].san!)
    const uci = m.from + m.to + (m.promotion ?? '')
    // Extra engine check only for top moves that leave something hanging (possible sacrifices).
    const isTop = analyses[i].lines[0]?.pv[0]?.slice(0, 4) === uci.slice(0, 4)
    const cap = isTop ? sacrificeCheck(frames[i].fen, uci) : null
    const captureScore = cap
      ? (await engine.analyze(c.fen(), { depth, multipv: 1, searchmoves: [cap] })).lines[0]?.score
      : undefined
    moves.push(
      reviewMove({
        fenBefore: frames[i].fen,
        uci,
        before: analyses[i],
        after: analyses[i + 1],
        prevTo: frames[i].move?.to ?? null,
        captureScore,
      }),
    )
  }

  const startTurn = new Chess(frames[0].fen).turn()
  const firstScore = analyses[0].lines[0]?.score ?? { cp: 0 }
  const evals: Score[] = [startTurn === 'w' ? firstScore : negate(firstScore), ...moves.map((m) => m.scoreAfterWhite)]
  const { white, black } = summarize(moves, startTurn)
  return { depth, moves, evals, white, black }
}

// ---------- cache (this browser only) ----------

const PREFIX = 'review:v1:'
const MAX_CACHED = 150

export function cachedReview(gameId: string, depth: number): GameReview | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${gameId}:${depth}`)
    return raw ? (JSON.parse(raw) as GameReview) : null
  } catch {
    return null
  }
}

export function saveReview(gameId: string, review: GameReview) {
  try {
    const key = `${PREFIX}${gameId}:${review.depth}`
    localStorage.setItem(key, JSON.stringify(review))
    // Keep the cache from growing forever: drop the oldest reviews.
    const order: string[] = JSON.parse(localStorage.getItem(`${PREFIX}order`) ?? '[]').filter((k: string) => k !== key)
    order.push(key)
    while (order.length > MAX_CACHED) localStorage.removeItem(order.shift()!)
    localStorage.setItem(`${PREFIX}order`, JSON.stringify(order))
  } catch {
    // Storage full or unavailable: the review still works, it just won't be remembered.
  }
}
