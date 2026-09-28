import { Chess, type Move, type PieceSymbol } from 'chess.js'
import type { Analysis, PvLine, Score } from './uci'

// ---------- scores ----------

/**
 * Chance of winning (0–100) for the side to move, from an engine score.
 * Same curve Lichess uses; forced mate counts as 100 or 0.
 */
export function winPct(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? 100 : 0
  const cp = Math.max(-2000, Math.min(2000, s.cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/** Flip a score to the other side's point of view. */
export function negate(s: Score): Score {
  return s.mate !== undefined ? { mate: -s.mate } : { cp: -s.cp }
}

/** Score from White's point of view, formatted like "+1.4", "-0.3" or "M3" / "-M2". */
export function formatEval(s: Score, turn: 'w' | 'b'): string {
  const w = turn === 'w' ? s : negate(s)
  if (w.mate !== undefined) return `${w.mate < 0 ? '-' : ''}M${Math.abs(w.mate)}`
  const v = w.cp / 100
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
}

/** Per-move accuracy (0–100) from how much winning chance was lost (Lichess formula). */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const drop = Math.max(0, winBefore - winAfter)
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669))
}

// ---------- material ----------

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

/** Material of `color` minus material of the other side, in pawns. */
export function materialBalance(fen: string, color: 'w' | 'b'): number {
  let sum = 0
  for (const row of new Chess(fen).board())
    for (const sq of row) if (sq) sum += (sq.color === color ? 1 : -1) * VALUE[sq.type]
  return sum
}

/** Play UCI moves from a position; stops quietly at the first illegal one. */
function playLine(fen: string, uci: string[]): { moves: Move[]; fens: string[] } {
  const chess = new Chess(fen)
  const moves: Move[] = []
  const fens: string[] = []
  for (const u of uci) {
    try {
      moves.push(chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as PieceSymbol | undefined }))
      fens.push(chess.fen())
    } catch {
      break
    }
  }
  return { moves, fens }
}

/**
 * The most material the side to move could grab right now by capturing a
 * loose or under-defended piece (a quick two-move exchange check).
 * Used to spot sacrifices: pieces deliberately left hanging.
 */
export type Hanging = { gain: number; piece: PieceSymbol | null; square: string | null; uci: string | null }

export function hangingGain(fen: string): Hanging {
  const chess = new Chess(fen)
  let best: Hanging = { gain: 0, piece: null, square: null, uci: null }
  for (const cap of chess.moves({ verbose: true })) {
    if (!cap.captured) continue
    const taken = VALUE[cap.captured]
    chess.move(cap)
    const recapture = chess.moves({ verbose: true }).some((m) => m.to === cap.to && !!m.captured)
    chess.undo()
    const gain = recapture ? taken - VALUE[cap.piece] : taken
    if (gain > best.gain) best = { gain, piece: cap.captured, square: cap.to, uci: cap.from + cap.to + (cap.promotion ?? '') }
  }
  return best
}

/** UCI moves → SAN, from a position. */
export function uciLineToSan(fen: string, uci: string[]): string[] {
  return playLine(fen, uci).moves.map((m) => m.san)
}

// ---------- classification ----------

export type MoveKind = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export const KIND_LABEL: Record<MoveKind, string> = {
  brilliant: 'Brilliant',
  great: 'Great move',
  best: 'Best move',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

export const KIND_SYMBOL: Record<MoveKind, string> = {
  brilliant: '!!',
  great: '!',
  best: '★',
  excellent: '✓',
  good: '✓',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

export type MoveReview = {
  kind: MoveKind
  /** Winning chances (0–100) for the player who moved, before and after the move. */
  winBefore: number
  winAfter: number
  accuracy: number
  /** The engine's preferred move and line (SAN), from the position before the move. */
  bestSan: string | null
  bestLine: string[]
  bestUci: string | null
  /** Plain-English explanation. */
  why: string
  /** Evaluation after the move, for the eval bar (White's view). */
  evalAfter: string
  scoreAfterWhite: Score
}

/** What the engine thinks of a position where the game is already over. */
function terminalScore(fen: string): Score | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) return { mate: -1 } // the side to move has been mated
  if (chess.isDraw()) return { cp: 0 }
  return null
}

/** Top score for the side to move, handling finished games. */
function topScore(fen: string, a: Analysis): Score {
  const t = terminalScore(fen)
  if (t) return t
  return a.lines[0]?.score ?? { cp: 0 }
}

const pct = (x: number) => `${Math.round(x)}%`
const pawns = (n: number) => (n === 1 ? '1 pawn' : `${n} pawns`)

export type ReviewInput = {
  fenBefore: string
  /** The move played, in UCI. */
  uci: string
  /** Engine analysis of the position before the move (MultiPV 2 or more). */
  before: Analysis
  /** Engine analysis of the position after the move (MultiPV 3 lets sacrifices be recognised). */
  after: Analysis
  /** Destination square of the previous move (to spot simple recaptures). */
  prevTo?: string | null
  /**
   * Engine score (opponent to move, from their side) if they take the piece left
   * hanging, from sacrificeCheck(). Lets a real sacrifice be told apart from a
   * piece that can't be taken safely.
   */
  captureScore?: Score
}

/**
 * If this move might be a sacrifice, the capture the engine should evaluate
 * (UCI, in the position after the move). Null if there's nothing to check.
 */
export function sacrificeCheck(fenBefore: string, uci: string): string | null {
  const c = new Chess(fenBefore)
  const move = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as PieceSymbol | undefined })
  const h = hangingGain(c.fen())
  const capturedValue = move.captured ? VALUE[move.captured] : 0
  return h.gain >= 2 && h.gain - capturedValue >= 1 ? h.uci : null
}

export function reviewMove({ fenBefore, uci, before, after, prevTo, captureScore }: ReviewInput): MoveReview {
  const mover = new Chess(fenBefore).turn()
  const played = playLine(fenBefore, [uci])
  const move = played.moves[0]
  if (!move) throw new Error(`Illegal move ${uci} in ${fenBefore}`)
  const fenAfter = played.fens[0]

  const bestLineObj: PvLine | undefined = before.lines[0]
  const bestUci = bestLineObj?.pv[0] ?? before.bestmove ?? null
  const bestLine = bestLineObj ? uciLineToSan(fenBefore, bestLineObj.pv.slice(0, 8)) : []
  const bestSan = bestLine[0] ?? null

  const scoreBefore = topScore(fenBefore, before)
  const scoreAfterOpp = topScore(fenAfter, after) // opponent to move
  const scoreAfterMover = negate(scoreAfterOpp)
  const winBefore = winPct(scoreBefore)
  const isBest = bestUci !== null && uci.slice(0, 4) === bestUci.slice(0, 4)
  const winAfter = isBest ? Math.max(winPct(scoreAfterMover), winBefore - 0.5) : winPct(scoreAfterMover)
  const loss = Math.max(0, winBefore - winAfter)
  const accuracy = moveAccuracy(winBefore, winAfter)

  const scoreAfterWhite = mover === 'w' ? scoreAfterMover : scoreAfterOpp
  const evalAfter = new Chess(fenAfter).isCheckmate() ? '#' : formatEval(scoreAfterOpp, mover === 'w' ? 'b' : 'w')

  let kind: MoveKind
  if (isBest || loss <= 0.5) kind = 'best'
  else if (loss <= 2) kind = 'excellent'
  else if (loss <= 5) kind = 'good'
  else if (loss <= 10) kind = 'inaccuracy'
  else if (loss <= 20) kind = 'mistake'
  else kind = 'blunder'

  // --- Brilliant: a real sacrifice that is also (close to) the best move.
  const oppReplyLine = after.lines[0]?.pv ?? []
  const cont = playLine(fenAfter, oppReplyLine.slice(0, 2))
  const matBefore = materialBalance(fenBefore, mover)
  const matAfterReply = cont.fens[0] ? materialBalance(cont.fens[0], mover) : materialBalance(fenAfter, mover)
  const matAfterOurReply = cont.fens[1] ? materialBalance(cont.fens[1], mover) : matAfterReply
  // Either the engine's own line gives material away, or a piece is left hanging on purpose.
  const pvSacrifice = matAfterReply <= matBefore - 2 && matAfterOurReply <= matBefore - 2
  const hanging = hangingGain(fenAfter)
  const capturedValue = move.captured ? VALUE[move.captured] : 0
  // It's only a real offer if taking it is a sensible option for the opponent,
  // not something that loses for them on the spot.
  const oppBestWin = winPct(scoreAfterOpp)
  const captureIsReal = captureScore
    ? winPct(captureScore) >= oppBestWin - 30
    : after.lines.slice(0, 3).some((l) => l.pv[0]?.slice(2, 4) === hanging.square)
  const leftHanging = hanging.gain >= 2 && hanging.gain - capturedValue >= 1 && captureIsReal
  const sacrifice = pvSacrifice || leftHanging
  const sacrificedPiece = pvSacrifice ? (cont.moves[0]?.captured ?? null) : hanging.piece
  if ((kind === 'best' || kind === 'excellent') && sacrifice && winBefore < 97 && winAfter >= 50) kind = 'brilliant'

  // --- Great: the only good move (the second-best is much worse).
  const second = before.lines[1]
  const beforeBoard = new Chess(fenBefore)
  const legalCount = beforeBoard.moves().length
  const forcedKingMove = beforeBoard.inCheck() && move.piece === 'k'
  const isRecapture = !!move.captured && prevTo === move.to
  let secondSan: string | null = null
  let secondWin = 0
  if (second) {
    secondWin = winPct(second.score)
    secondSan = uciLineToSan(fenBefore, second.pv.slice(0, 1))[0] ?? null
  }
  if (kind === 'best' && second && winBefore - secondWin >= 15 && winBefore < 97 && legalCount > 3 && !isRecapture && !forcedKingMove)
    kind = 'great'

  // --- Explanation.
  const why = explain({
    kind,
    move,
    fenBefore,
    fenAfter,
    winBefore,
    winAfter,
    bestSan,
    bestLine,
    scoreBefore,
    scoreAfterOpp,
    cont,
    matBefore,
    matAfterOurReply,
    secondSan,
    secondWin,
    sacrificedPiece,
  })

  return { kind, winBefore, winAfter, accuracy, bestSan, bestLine, bestUci, why, evalAfter, scoreAfterWhite }
}

type ExplainCtx = {
  kind: MoveKind
  move: Move
  fenBefore: string
  fenAfter: string
  winBefore: number
  winAfter: number
  bestSan: string | null
  bestLine: string[]
  scoreBefore: Score
  scoreAfterOpp: Score
  cont: { moves: Move[]; fens: string[] }
  matBefore: number
  matAfterOurReply: number
  secondSan: string | null
  secondWin: number
  sacrificedPiece: PieceSymbol | null
}

function explain(c: ExplainCtx): string {
  // The better move and the engine's line are shown separately on screen,
  // so the explanation focuses on *why*.
  const lost = c.matBefore - c.matAfterOurReply
  const reply = c.cont.moves[0]

  switch (c.kind) {
    case 'brilliant': {
      const given = c.sacrificedPiece ? `your ${NAME[c.sacrificedPiece]}` : 'material'
      return `A brilliant sacrifice! ${c.move.san} offers ${given}, but the engine confirms it's the strongest move. ${
        c.winAfter >= 90 ? 'The attack that follows is decisive.' : 'The activity it wins is worth more than the material.'
      }`
    }
    case 'great':
      return `The only move that holds the position. Every alternative is clearly worse: the next best, ${
        c.secondSan ?? 'anything else'
      }, would drop your chances from ${pct(c.winBefore)} to about ${pct(c.secondWin)}.`
    case 'best':
      if (c.scoreBefore.mate !== undefined && c.scoreBefore.mate > 0)
        return `The best move. It keeps a forced checkmate going (mate in ${c.scoreBefore.mate}).`
      return 'The best move, the engine’s top choice.'
    case 'excellent':
      return 'Nearly as good as the best move. Hardly any advantage lost.'
    case 'good':
      return 'A reasonable move, but there was a more precise one.'
  }

  // Inaccuracy, mistake or blunder: find the concrete reason.
  const label = c.kind === 'blunder' ? 'A blunder.' : c.kind === 'mistake' ? 'A mistake.' : 'An inaccuracy.'

  if (c.scoreAfterOpp.mate !== undefined && c.scoreAfterOpp.mate > 0) {
    return `${label} This allows a forced checkmate in ${c.scoreAfterOpp.mate}${reply ? `, starting with ${reply.san}` : ''}.`
  }
  if (c.scoreBefore.mate !== undefined && c.scoreBefore.mate > 0) {
    return `${label} You had a forced checkmate in ${c.scoreBefore.mate} starting with ${c.bestSan}, and this move lets it slip.`
  }
  if (lost >= 2 && reply?.captured) {
    return `${label} It loses material: after ${reply.san} your ${NAME[reply.captured]} is gone and you can’t win it back (down about ${pawns(
      lost,
    )}).`
  }
  if (c.bestLine[0]?.includes('x') && c.winBefore - c.winAfter >= 10) {
    return `${label} ${c.bestSan} was a strong capture here, and the chance was missed. Your winning chances drop from ${pct(
      c.winBefore,
    )} to ${pct(c.winAfter)}.`
  }
  return `${label} Your winning chances drop from ${pct(c.winBefore)} to ${pct(c.winAfter)}.`
}

// ---------- whole game ----------

export type SideSummary = { accuracy: number; counts: Record<MoveKind, number> }

export function summarize(reviews: MoveReview[], startTurn: 'w' | 'b' = 'w'): { white: SideSummary; black: SideSummary } {
  const empty = (): SideSummary => ({
    accuracy: 0,
    counts: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  })
  const out = { white: empty(), black: empty() }
  const accs: Record<'white' | 'black', number[]> = { white: [], black: [] }
  reviews.forEach((r, i) => {
    const side = (i % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    out[side].counts[r.kind]++
    accs[side].push(r.accuracy)
  })
  for (const side of ['white', 'black'] as const) {
    const a = accs[side]
    out[side].accuracy = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
  }
  return out
}
