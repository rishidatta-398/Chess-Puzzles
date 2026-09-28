/// <reference types="node" />
import { afterAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { Engine } from './engine'
import { formatEval, hangingGain, materialBalance, sacrificeCheck, moveAccuracy, negate, reviewMove, summarize, winPct, type MoveReview } from './review'
// @ts-expect-error plain JS module without type declarations
import { nodeTransport } from '../../scripts/engineNode.mjs'

describe('winPct / formatEval / accuracy', () => {
  it('maps scores to winning chances', () => {
    expect(winPct({ cp: 0 })).toBe(50)
    expect(winPct({ cp: 300 })).toBeGreaterThan(75)
    expect(winPct({ cp: -300 })).toBeLessThan(25)
    expect(winPct({ mate: 3 })).toBe(100)
    expect(winPct({ mate: -1 })).toBe(0)
    expect(winPct(negate({ mate: -1 }))).toBe(100)
  })
  it('formats evals from White’s side', () => {
    expect(formatEval({ cp: 135 }, 'w')).toBe('+1.4')
    expect(formatEval({ cp: 135 }, 'b')).toBe('-1.4')
    expect(formatEval({ mate: 2 }, 'b')).toBe('-M2')
  })
  it('scores accuracy', () => {
    expect(moveAccuracy(60, 60)).toBeCloseTo(100, 0)
    expect(moveAccuracy(60, 20)).toBeLessThan(20)
  })
  it('finds loose pieces', () => {
    // Black to move can take the undefended white queen on d5.
    expect(hangingGain('4k3/8/8/3Q4/8/8/8/3rK3 b - - 0 1')).toMatchObject({ gain: 9, piece: 'q', square: 'd5', uci: 'd1d5' })
    // A defended pawn attacked by a queen is not a free gain.
    expect(hangingGain('4k3/8/8/3p4/4P3/8/8/3QK3 w - - 0 1').gain).toBeLessThan(2)
  })
  it('counts material', () => {
    expect(materialBalance('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toBe(0)
    expect(materialBalance('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', 'b')).toBe(-9)
  })
})

// ---- real engine ----
const engine = new Engine(nodeTransport())
afterAll(() => engine.terminate())

async function review(fen: string, uci: string, prevTo?: string): Promise<MoveReview> {
  const before = await engine.analyze(fen, { depth: 14, multipv: 3 })
  const c = new Chess(fen)
  c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as 'q' | undefined })
  const after = await engine.analyze(c.fen(), { depth: 14, multipv: 3 })
  const cap = sacrificeCheck(fen, uci)
  const captureScore = cap ? (await engine.analyze(c.fen(), { depth: 14, multipv: 1, searchmoves: [cap] })).lines[0]?.score : undefined
  return reviewMove({ fenBefore: fen, uci, before, after, prevTo, captureScore })
}

/** Position after playing SAN moves from the start. */
function after(sans: string): string {
  const c = new Chess()
  for (const s of sans.split(' ')) c.move(s)
  return c.fen()
}

describe('reviewMove (real Stockfish)', () => {
  it('calls hanging a bishop a blunder and says why', async () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Ba6?? bxa6 wins the bishop.
    const r = await review(after('e4 e5 Nf3 Nc6'), 'f1a6')
    expect(['mistake', 'blunder']).toContain(r.kind)
    expect(r.why).toMatch(/bishop/)
    expect(r.bestSan).not.toBe('Ba6')
  }, 60000)

  it('spots a move that allows checkmate', async () => {
    // Black's rook guards the back rank; ...Rd2?? walks away and allows Re8#.
    const fen = '3r2k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1'
    const r = await review(fen, 'd8d2')
    expect(r.kind).toBe('blunder')
    expect(r.why).toMatch(/checkmate/)
  }, 60000)

  it('does not call an ordinary queen trade a sacrifice', async () => {
    // Queens are traded on d8; that's not brilliant.
    const r = await review(after('e4 e5 d4 exd4 Qxd4 Nc6 Qe3 d6 Qd3 Qd7 Nf3 Qe7 Qd6'), 'e7d6')
    expect(r.kind).not.toBe('brilliant')
  }, 60000)

  it('grades the best move as best', async () => {
    const r = await review('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', 'a1a8')
    expect(['best', 'great']).toContain(r.kind)
    expect(r.evalAfter).toBe('#')
  }, 60000)

  it('Game of the Century: 17...Be6!! is brilliant', async () => {
    const moves =
      'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1'
    const r = await review(after(moves), 'g4e6')
    expect(r.kind).toBe('brilliant')
    expect(r.why).toMatch(/sacrifice/)
    expect(r.why).toMatch(/queen/)
  }, 60000)

  it('Ding–Gukesh 2024: 55.Rf2 is a blunder (real game from the library)', async () => {
    const games = JSON.parse(readFileSync('public/games/gukesh.json', 'utf8')) as { e?: string; rd?: string; m: string }[]
    const g = games.find((x) => x.e === 'WCh 2024' && x.rd === '14.1')!
    const sans = g.m.split(' ')
    const c = new Chess()
    for (const s of sans.slice(0, 108)) c.move(s)
    const m = c.move(sans[108])
    expect(m.san).toBe('Rf2')
    c.undo()
    const r = await review(c.fen(), m.from + m.to)
    expect(r.kind).toBe('blunder')
  }, 60000)
})

describe('summarize', () => {
  it('splits accuracy and counts by side', () => {
    const r = (kind: MoveReview['kind'], accuracy: number) => ({ kind, accuracy }) as MoveReview
    const s = summarize([r('best', 100), r('blunder', 10), r('good', 80), r('best', 100)])
    expect(s.white.accuracy).toBe(90)
    expect(s.black.accuracy).toBe(55)
    expect(s.black.counts.blunder).toBe(1)
  })
})
