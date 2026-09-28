import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module without type declarations
import { BucketSampler, bucketFileName, bucketOf, hashId, parseRow, passesFilters, phaseOf } from './puzzleCsv.mjs'

const ROW =
  '00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,72,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,Italian_Game'

describe('parseRow', () => {
  it('parses a Lichess row', () => {
    const r = parseRow(ROW)
    expect(r).toMatchObject({ id: '00sHx', rating: 1760, deviation: 80, popularity: 83, plays: 72 })
    expect(r.moves).toBe('e8d7 a2e6 d7d8 f7f8')
    expect(r.themes).toBe('mate mateIn2 middlegame short')
  })
  it('skips the header', () => {
    expect(parseRow('PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags')).toBeNull()
  })
  it('skips malformed rows', () => {
    expect(parseRow('abc,def')).toBeNull()
  })
})

describe('passesFilters', () => {
  it('rejects rows with too few plays', () => {
    expect(passesFilters(parseRow(ROW))).toBe(false)
  })
  it('accepts a popular, well-played row', () => {
    const r = { ...parseRow(ROW), plays: 5000, popularity: 95 }
    expect(passesFilters(r)).toBe(true)
  })
})

describe('bucketOf', () => {
  it('rounds down to the nearest hundred', () => {
    expect(bucketOf(1760)).toBe(1700)
    expect(bucketOf(1700)).toBe(1700)
  })
  it('clamps extremes', () => {
    expect(bucketOf(250)).toBe(400)
    expect(bucketOf(3400)).toBe(3100)
  })
})

describe('BucketSampler', () => {
  it('keeps at most cap rows, deterministically', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}` }))
    const a = new BucketSampler(50)
    const b = new BucketSampler(50)
    rows.forEach((r) => a.offer(r))
    ;[...rows].reverse().forEach((r) => b.offer(r))
    const ra = a.result().map((r: { id: string }) => r.id).sort()
    const rb = b.result().map((r: { id: string }) => r.id).sort()
    expect(ra).toHaveLength(50)
    expect(ra).toEqual(rb)
  })
  it('keeps the rows with the smallest hashes', () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({ id: `x${i}` }))
    const s = new BucketSampler(10)
    rows.forEach((r) => s.offer(r))
    const expected = rows
      .map((r) => r.id)
      .sort((x, y) => hashId(x) - hashId(y))
      .slice(0, 10)
      .sort()
    expect(s.result().map((r: { id: string }) => r.id).sort()).toEqual(expected)
  })
})

describe('phaseOf', () => {
  it('reads the phase tag', () => {
    expect(phaseOf('fork opening short')).toBe('opening')
    expect(phaseOf('mate mateIn2 endgame')).toBe('endgame')
    expect(phaseOf('middlegame pin')).toBe('middlegame')
  })
  it('falls back to middlegame', () => {
    expect(phaseOf('fork short')).toBe('middlegame')
  })
})

describe('bucketFileName', () => {
  it('pads the rating and adds the phase', () => {
    expect(bucketFileName(600, 'endgame')).toBe('r0600-endgame.json')
  })
})
