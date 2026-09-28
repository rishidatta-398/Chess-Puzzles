import { Chess } from 'chess.js'
import { parseUci, type PreparedPuzzle } from './puzzles'

export type SolverStatus = 'playing' | 'solved'

export type SolverState = {
  prepared: PreparedPuzzle
  /** Current position. */
  fen: string
  /** How many solution moves (solver + replies) have been played. */
  ply: number
  status: SolverStatus
  /** True once the player has made any wrong move, used a hint, or given up. */
  failed: boolean
  /** True once the player has used a hint. */
  hinted: boolean
  lastMove: { from: string; to: string } | null
}

export type AttemptResult =
  | { kind: 'illegal' }
  | { kind: 'wrong'; state: SolverState; wrongMove: { from: string; to: string; fen: string } }
  | { kind: 'correct'; state: SolverState; reply: string | null }
  | { kind: 'solved'; state: SolverState }

export function startSolver(prepared: PreparedPuzzle): SolverState {
  return {
    prepared,
    fen: prepared.startFen,
    ply: 0,
    status: 'playing',
    failed: false,
    hinted: false,
    lastMove: prepared.setupMove,
  }
}

/** The move the solver is expected to play now (UCI), or null if none. */
export function expectedMove(s: SolverState): string | null {
  return s.status === 'playing' ? (s.prepared.solution[s.ply] ?? null) : null
}

/**
 * The player tries a move.
 * - Matches the solution: correct (or solved if it was the last move).
 * - Any other move that gives checkmate: also solved (same rule as Lichess).
 * - Otherwise: wrong. The position does not change, so the player can try again.
 */
export function attemptMove(s: SolverState, from: string, to: string): AttemptResult {
  const expected = expectedMove(s)
  if (!expected) return { kind: 'illegal' }
  const want = parseUci(expected)

  // For promotions, use the solution's piece when the squares match; otherwise a queen.
  const promotion = from === want.from && to === want.to && want.promotion ? want.promotion : 'q'
  const game = new Chess(s.fen)
  let played
  try {
    played = game.move({ from, to, promotion })
  } catch {
    return { kind: 'illegal' }
  }

  const matches = played.from === want.from && played.to === want.to && (!want.promotion || played.promotion === want.promotion)
  const isLast = s.ply === s.prepared.solution.length - 1

  if (!matches) {
    if (game.isCheckmate()) {
      return { kind: 'solved', state: { ...s, fen: game.fen(), ply: s.ply + 1, status: 'solved', lastMove: played } }
    }
    return {
      kind: 'wrong',
      state: { ...s, failed: true },
      wrongMove: { from: played.from, to: played.to, fen: game.fen() },
    }
  }

  const next: SolverState = { ...s, fen: game.fen(), ply: s.ply + 1, lastMove: played }
  if (isLast) return { kind: 'solved', state: { ...next, status: 'solved' } }
  return { kind: 'correct', state: next, reply: s.prepared.solution[s.ply + 1] ?? null }
}

/** Play the opponent's reply (the next solution move). */
export function playReply(s: SolverState): SolverState {
  const reply = s.prepared.solution[s.ply]
  if (!reply || s.status !== 'playing') return s
  const game = new Chess(s.fen)
  const m = game.move(parseUci(reply))
  const next = { ...s, fen: game.fen(), ply: s.ply + 1, lastMove: m }
  // A solution should never end on the opponent's move, but guard anyway.
  return next.ply >= s.prepared.solution.length ? { ...next, status: 'solved' } : next
}

/** Give up: mark as failed. The page then shows the solution. */
export function giveUp(s: SolverState): SolverState {
  return { ...s, failed: true }
}

/** Square of the piece the player should move next (for the hint), or null. */
export function hintSquare(s: SolverState): string | null {
  const m = expectedMove(s)
  return m ? parseUci(m).from : null
}

/** Use a hint: the puzzle no longer counts as solved first try. */
export function takeHint(s: SolverState): SolverState {
  return s.status === 'playing' ? { ...s, hinted: true, failed: true } : s
}
