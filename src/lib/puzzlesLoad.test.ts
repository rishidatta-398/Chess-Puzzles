import { beforeAll, describe, expect, it, vi } from 'vitest'
import { countMatching, randomPuzzle } from './puzzles'

const K = '8/8/8/8/8/8/8/K6k w - - 0 1'

// Fake puzzle files served through a stubbed fetch.
const FILES: Record<string, unknown> = {
  'index.json': {
    version: 2,
    source: 'test',
    total: 5,
    themes: {},
    phases: { opening: 1, middlegame: 2, endgame: 2 },
    buckets: [
      {
        min: 1000,
        max: 1099,
        count: 3,
        files: {
          opening: { file: 'r1000-opening.json', count: 1 },
          middlegame: { file: 'r1000-middlegame.json', count: 1 },
          endgame: { file: 'r1000-endgame.json', count: 1 },
        },
      },
      {
        min: 1100,
        max: 1199,
        count: 2,
        files: {
          middlegame: { file: 'r1100-middlegame.json', count: 1 },
          endgame: { file: 'r1100-endgame.json', count: 1 },
        },
      },
    ],
  },
  'r1000-opening.json': [['o1', K, 'a1a2 h1h2', 1010, 'opening']],
  'r1000-middlegame.json': [['m1', K, 'a1a2 h1h2', 1050, 'middlegame']],
  'r1000-endgame.json': [['e1', K, 'a1a2 h1h2', 1090, 'endgame']],
  'r1100-middlegame.json': [['m2', K, 'a1a2 h1h2', 1120, 'middlegame']],
  'r1100-endgame.json': [['e2', K, 'a1a2 h1h2', 1180, 'endgame']],
}

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const body = FILES[url.split('/').pop()!]
    return { ok: body !== undefined, json: async () => body }
  })
})

describe('countMatching', () => {
  it('counts by rating range', async () => {
    expect(await countMatching({ min: 1000, max: 1100 })).toEqual({ total: 3, left: 3 })
    expect(await countMatching({ min: 1000, max: 1200 })).toEqual({ total: 5, left: 5 })
  })
  it('counts by phase', async () => {
    expect(await countMatching({ min: 1000, max: 1200, phases: ['endgame'] })).toEqual({ total: 2, left: 2 })
    expect(await countMatching({ min: 1000, max: 1200, phases: ['opening', 'middlegame'] })).toEqual({ total: 3, left: 3 })
    expect(await countMatching({ min: 1100, max: 1200, phases: ['opening'] })).toEqual({ total: 0, left: 0 })
  })
  it('subtracts puzzles already seen', async () => {
    expect(await countMatching({ min: 1000, max: 1200 }, new Set(['o1', 'e2']))).toEqual({ total: 5, left: 3 })
  })
})

describe('randomPuzzle', () => {
  it('only returns puzzles from the chosen phase', async () => {
    for (let i = 0; i < 10; i++) {
      const p = await randomPuzzle({ min: 1000, max: 1200, phases: ['endgame'] })
      expect(p!.themes).toContain('endgame')
    }
  })
  it('never repeats a seen puzzle and runs out cleanly', async () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const p = await randomPuzzle({ min: 1000, max: 1200 }, seen)
      expect(p).not.toBeNull()
      expect(seen.has(p!.id)).toBe(false)
      seen.add(p!.id)
    }
    expect(await randomPuzzle({ min: 1000, max: 1200 }, seen)).toBeNull()
  })
})
