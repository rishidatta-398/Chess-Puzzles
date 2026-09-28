import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { bucketsInRange, filesFor, fromCompact, playUciLine, preparePuzzle, type CompactPuzzle, type PuzzleIndex } from './puzzles'

// Hand-made puzzles in Lichess format (first move is the opponent's setup move).
export const FIXTURES: CompactPuzzle[] = [
  ['tBack1', '6k1/1p3ppp/8/8/8/8/5PPP/R5K1 b - - 0 1', 'b7b6 a1a8', 600, 'mate mateIn1 backRankMate endgame oneMove'],
  ['tLadr2', '7k/8/8/8/8/8/1R6/R5K1 b - - 0 1', 'h8g8 b2b7 g8f8 a1a8', 800, 'mate mateIn2 endgame short'],
  ['tFork3', '4k3/8/8/q7/2N5/8/8/4K3 b - - 0 1', 'a5b5 c4d6 e8d7 d6b5', 900, 'fork crushing endgame short'],
]

describe('fixtures are legal puzzles', () => {
  for (const c of FIXTURES) {
    it(`${c[0]} plays through`, () => {
      const p = fromCompact(c)
      const line = playUciLine(p.fen, p.moves)
      expect(line).toHaveLength(p.moves.length)
      if (p.themes.includes('mate')) expect(new Chess(line.at(-1)!.fen).isCheckmate()).toBe(true)
    })
  }
})

describe('fromCompact', () => {
  it('splits moves and themes', () => {
    const p = fromCompact(FIXTURES[1])
    expect(p.moves).toEqual(['h8g8', 'b2b7', 'g8f8', 'a1a8'])
    expect(p.themes).toContain('mateIn2')
    expect(p.rating).toBe(800)
  })
})

describe('preparePuzzle', () => {
  it("plays the opponent's setup move first", () => {
    const prepared = preparePuzzle(fromCompact(FIXTURES[0]))
    expect(prepared.setupMove).toMatchObject({ from: 'b7', to: 'b6', san: 'b6' })
    expect(prepared.solution).toEqual(['a1a8'])
  })
  it('orients the board to the solver', () => {
    // Black makes the setup move, so the solver is White.
    expect(preparePuzzle(fromCompact(FIXTURES[2])).orientation).toBe('white')
    // A puzzle where White sets up and Black solves.
    const blackSolves = fromCompact(['tB', '6k1/5ppp/8/8/8/8/rP3PPP/6K1 w - - 0 1', 'b2b3 a2a1', 700, 'mate mateIn1'])
    const prepared = preparePuzzle(blackSolves)
    expect(prepared.orientation).toBe('black')
    expect(new Chess(playUciLine(prepared.startFen, prepared.solution).at(-1)!.fen).isCheckmate()).toBe(true)
  })
  it('rejects a puzzle with no solution', () => {
    expect(() => preparePuzzle(fromCompact(['x', '8/8/8/8/8/8/8/K6k w - - 0 1', 'a1a2', 500, '']))).toThrow()
  })
  it('handles promotion moves', () => {
    const line = playUciLine('8/P7/8/8/8/8/8/1k5K w - - 0 1', ['a7a8n'])
    expect(line[0].san).toBe('a8=N')
  })
})

describe('bucketsInRange / filesFor', () => {
  const b = (min: number) => ({
    min,
    max: min + 99,
    count: 2,
    files: {
      middlegame: { file: `r${min}-middlegame.json`, count: 1 },
      endgame: { file: `r${min}-endgame.json`, count: 1 },
    },
  })
  const index: PuzzleIndex = {
    version: 2,
    source: '',
    total: 0,
    themes: {},
    phases: { opening: 0, middlegame: 3, endgame: 3 },
    buckets: [b(800), b(900), b(1000)],
  }
  it('selects overlapping buckets', () => {
    expect(bucketsInRange(index, 950, 1050).map((x) => x.min)).toEqual([900, 1000])
    expect(bucketsInRange(index, 1200, 1400)).toEqual([])
  })
  it('lists files for chosen phases only', () => {
    expect(filesFor(index, 900, 999, ['endgame'])).toEqual(['r900-endgame.json'])
    expect(filesFor(index, 900, 999, ['opening'])).toEqual([])
  })
  it('treats no phases as all phases', () => {
    expect(filesFor(index, 900, 999, [])).toEqual(['r900-middlegame.json', 'r900-endgame.json'])
    expect(filesFor(index, 900, 999)).toEqual(['r900-middlegame.json', 'r900-endgame.json'])
  })
})
