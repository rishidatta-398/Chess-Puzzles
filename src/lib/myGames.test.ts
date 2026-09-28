import { describe, expect, it } from 'vitest'
import { parseImport } from './myGames'

// Shaped like a Chess.com export: headers plus clock comments on every move.
const CHESS_COM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.20"]
[White "rishi_d"]
[Black "opponent99"]
[Result "1-0"]
[WhiteElo "1450"]
[BlackElo "1420"]
[TimeControl "600"]

1. e4 {[%clk 0:09:58]} 1... e5 {[%clk 0:09:57]} 2. Qh5 {[%clk 0:09:50]} 2... Nc6 {[%clk 0:09:40]} 3. Bc4 {[%clk 0:09:45]} 3... Nf6?? {[%clk 0:09:30]} 4. Qxf7# {[%clk 0:09:44]} 1-0
`

// Shaped like a Lichess analysis export: a variation, a NAG and a comment.
const LICHESS = `[Event "Casual game"]
[White "A"]
[Black "B"]
[Result "0-1"]
[UTCDate "2026.01.05"]

1. f3 e5 2. g4 $4 (2. e4 Nc6 (2... d5)) 2... Qh4# { Fool's mate. } 0-1`

describe('parseImport', () => {
  it('reads a Chess.com export with clock comments', () => {
    const { games, errors } = parseImport(CHESS_COM, 'white', new Date('2026-09-27T00:00:00Z'))
    expect(errors).toEqual([])
    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({
      w: 'rishi_d',
      b: 'opponent99',
      r: '1-0',
      d: '2026-09-20',
      we: '1450',
      me: 'white',
      m: 'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#',
      added: '2026-09-27T00:00:00.000Z',
    })
    expect(games[0].id).toMatch(/^my-/)
  })

  it('reads a Lichess export with variations and NAGs', () => {
    const { games, errors } = parseImport(LICHESS)
    expect(errors).toEqual([])
    expect(games[0]).toMatchObject({ m: 'f3 e5 g4 Qh4#', r: '0-1', d: '2026-01-05' })
  })

  it('accepts plain moves with no headers', () => {
    const { games } = parseImport('1. d4 d5 2. c4 e6')
    expect(games[0]).toMatchObject({ w: 'White', b: 'Black', r: '*', m: 'd4 d5 c4 e6' })
  })

  it('imports several games at once', () => {
    const { games } = parseImport(CHESS_COM + '\n' + LICHESS)
    expect(games.map((g) => g.m)).toEqual(['e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#', 'f3 e5 g4 Qh4#'])
  })

  it('points at the exact illegal move', () => {
    const { games, errors } = parseImport('1. e4 e5 2. Nf3 Nc6 3. Bb5 Ke7 4. Ke3')
    expect(games).toEqual([])
    expect(errors[0]).toMatch(/move 4\. "Ke3"/)
  })

  it('reports an empty paste', () => {
    expect(parseImport('   ').errors[0]).toMatch(/Paste a game/)
  })

  it('gives the same id to the same game imported twice', () => {
    expect(parseImport(CHESS_COM).games[0].id).toBe(parseImport(CHESS_COM).games[0].id)
  })

  it('supports a custom starting position', () => {
    const pgn = '[SetUp "1"]\n[FEN "8/P7/8/8/8/8/8/1k5K w - - 0 1"]\n\n1. a8=Q+ *'
    const { games, errors } = parseImport(pgn)
    expect(errors).toEqual([])
    expect(games[0].fen).toBe('8/P7/8/8/8/8/8/1k5K w - - 0 1')
  })
})
