import { describe, expect, it } from 'vitest'
import { SearchCollector, parseBestmove, parseInfo } from './uci'

describe('parseInfo', () => {
  it('reads depth, multipv, cp score and pv', () => {
    const l = parseInfo('info depth 14 seldepth 20 multipv 2 score cp -35 nodes 1000 nps 5000 time 200 pv e7e5 g1f3 b8c6')
    expect(l).toEqual({ depth: 14, multipv: 2, score: { cp: -35 }, pv: ['e7e5', 'g1f3', 'b8c6'] })
  })
  it('reads mate scores', () => {
    expect(parseInfo('info depth 5 score mate -2 pv h7h8 g6g7')?.score).toEqual({ mate: -2 })
  })
  it('defaults multipv to 1', () => {
    expect(parseInfo('info depth 3 score cp 10 pv e2e4')?.multipv).toBe(1)
  })
  it('ignores bound scores and lines without pv', () => {
    expect(parseInfo('info depth 10 score cp 20 lowerbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 10 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfo('info string NNUE evaluation enabled')).toBeNull()
  })
})

describe('parseBestmove', () => {
  it('reads the move', () => {
    expect(parseBestmove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestmove('bestmove (none)')).toBeNull()
    expect(parseBestmove('info depth 1')).toBeUndefined()
  })
})

describe('SearchCollector', () => {
  it('keeps the deepest line per multipv and finishes on bestmove', () => {
    const c = new SearchCollector()
    c.add('info depth 1 multipv 1 score cp 10 pv d2d4')
    c.add('info depth 1 multipv 2 score cp 5 pv e2e4')
    c.add('info depth 2 multipv 1 score cp 20 pv e2e4 e7e5')
    expect(c.done).toBe(false)
    c.add('bestmove e2e4 ponder e7e5')
    expect(c.done).toBe(true)
    const r = c.result()
    expect(r.bestmove).toBe('e2e4')
    expect(r.lines.map((l) => [l.multipv, l.depth, l.pv[0]])).toEqual([
      [1, 2, 'e2e4'],
      [2, 1, 'e2e4'],
    ])
  })
})
