import { describe, expect, it } from 'vitest'
import { fromCompact, preparePuzzle, type CompactPuzzle } from './puzzles'
import { attemptMove, expectedMove, giveUp, playReply, startSolver } from './puzzleSolver'

const make = (c: CompactPuzzle) => startSolver(preparePuzzle(fromCompact(c)))

const MATE1: CompactPuzzle = ['m1', '6k1/1p3ppp/8/8/8/8/5PPP/R5K1 b - - 0 1', 'b7b6 a1a8', 600, 'mateIn1']
const LADDER: CompactPuzzle = ['m2', '7k/8/8/8/8/8/1R6/R5K1 b - - 0 1', 'h8g8 b2b7 g8f8 a1a8', 800, 'mateIn2']
const FORK: CompactPuzzle = ['f1', '4k3/8/8/q7/2N5/8/8/4K3 b - - 0 1', 'a5b5 c4d6 e8d7 d6b5', 900, 'fork']

describe('startSolver', () => {
  it('starts after the setup move', () => {
    const s = make(MATE1)
    expect(s.status).toBe('playing')
    expect(s.lastMove).toMatchObject({ from: 'b7', to: 'b6' })
    expect(expectedMove(s)).toBe('a1a8')
  })
})

describe('attemptMove', () => {
  it('solves a mate in one', () => {
    const r = attemptMove(make(MATE1), 'a1', 'a8')
    expect(r.kind).toBe('solved')
    if (r.kind === 'solved') expect(r.state.failed).toBe(false)
  })

  it('rejects an illegal move without changing anything', () => {
    expect(attemptMove(make(MATE1), 'a1', 'b3').kind).toBe('illegal')
  })

  it('marks a legal but wrong move and keeps the position', () => {
    const s = make(MATE1)
    const r = attemptMove(s, 'a1', 'a7')
    expect(r.kind).toBe('wrong')
    if (r.kind === 'wrong') {
      expect(r.state.fen).toBe(s.fen)
      expect(r.state.failed).toBe(true)
      expect(r.wrongMove).toMatchObject({ from: 'a1', to: 'a7' })
    }
  })

  it('can still solve after a wrong try, but stays marked as failed', () => {
    const r1 = attemptMove(make(MATE1), 'a1', 'a7')
    if (r1.kind !== 'wrong') throw new Error('expected wrong')
    const r2 = attemptMove(r1.state, 'a1', 'a8')
    expect(r2.kind).toBe('solved')
    if (r2.kind === 'solved') expect(r2.state.failed).toBe(true)
  })

  it('walks a multi-move line with an opponent reply', () => {
    const r1 = attemptMove(make(LADDER), 'b2', 'b7')
    expect(r1.kind).toBe('correct')
    if (r1.kind !== 'correct') return
    expect(r1.reply).toBe('g8f8')
    const afterReply = playReply(r1.state)
    expect(afterReply.lastMove).toMatchObject({ from: 'g8', to: 'f8' })
    expect(attemptMove(afterReply, 'a1', 'a8').kind).toBe('solved')
  })

  it('accepts a different move if it is checkmate', () => {
    // Both Ra8# and Rd8# are mate. The listed answer is Ra8.
    const s = make(['alt', '6k1/1p3ppp/8/8/8/8/5PPP/R2R2K1 b - - 0 1', 'b7b6 a1a8', 700, 'mateIn1'])
    expect(attemptMove(s, 'd1', 'd8').kind).toBe('solved')
  })

  it('handles a non-mate tactic to the end', () => {
    const r1 = attemptMove(make(FORK), 'c4', 'd6')
    if (r1.kind !== 'correct') throw new Error('expected correct')
    const s = playReply(r1.state)
    const r2 = attemptMove(s, 'd6', 'b5')
    expect(r2.kind).toBe('solved')
  })

  it('does nothing once solved', () => {
    const r = attemptMove(make(MATE1), 'a1', 'a8')
    if (r.kind !== 'solved') throw new Error('expected solved')
    expect(attemptMove(r.state, 'g1', 'f1').kind).toBe('illegal')
  })

  it('uses the solution piece for underpromotion', () => {
    // The listed answer promotes to a knight; dragging the pawn to b8 should play that.
    const s = make(['p1', '8/1P6/8/8/8/8/k1q5/4K3 b - - 0 1', 'a2a3 b7b8n', 1500, 'promotion'])
    const r = attemptMove(s, 'b7', 'b8')
    expect(r.kind).toBe('solved')
  })
})

describe('giveUp', () => {
  it('marks the puzzle as failed', () => {
    expect(giveUp(make(MATE1)).failed).toBe(true)
  })
})
