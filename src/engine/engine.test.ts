import { afterAll, describe, expect, it } from 'vitest'
import { Engine } from './engine'
// @ts-expect-error plain JS module without type declarations
import { nodeTransport } from '../../scripts/engineNode.mjs'

// These tests run the real Stockfish, so they take a few seconds.
const engine = new Engine(nodeTransport())
afterAll(() => engine.terminate())

describe('Engine (real Stockfish)', () => {
  it('finds mate in one', async () => {
    const r = await engine.analyze('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', { depth: 8 })
    expect(r.bestmove).toBe('a1a8')
    expect(r.lines[0].score).toEqual({ mate: 1 })
  }, 30000)

  it('returns several lines with MultiPV', async () => {
    const r = await engine.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 8, multipv: 3 })
    expect(r.lines).toHaveLength(3)
    expect(new Set(r.lines.map((l) => l.pv[0])).size).toBe(3)
  }, 30000)

  it('scores a queen-up position as clearly winning', async () => {
    const r = await engine.analyze('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', { depth: 8 })
    const s = r.lines[0].score
    expect(s.mate !== undefined ? s.mate > 0 : s.cp! > 500).toBe(true)
  }, 30000)

  it('runs queued searches in order', async () => {
    const [a, b] = await Promise.all([
      engine.analyze('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', { depth: 6 }),
      engine.analyze('r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', { depth: 6 }),
    ])
    expect(a.bestmove).toBe('a1a8')
    expect(b.bestmove).toBe('a8a1')
  }, 30000)
})
