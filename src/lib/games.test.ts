import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
  colorOf,
  displayName,
  eventKinds,
  importance,
  sortGames,
  formatDate,
  gameEnding,
  gameFrames,
  moveCount,
  outcomeFor,
  resultText,
  searchGames,
  surnameOf,
  type Game,
} from './games'

const G: Game[] = [
  { id: '1', w: 'Byrne, Donald', b: 'Fischer, Robert James', r: '0-1', d: '1956-10-17', e: 'Rosenwald Memorial', s: 'New York', m: 'Nf3 Nf6 c4 g6' },
  { id: '2', w: 'Fischer, Robert James', b: 'Spassky, Boris V', r: '1-0', d: '1972-07-23', e: 'World Championship', eco: 'D59', m: 'c4 e6 Nf3 d5' },
  { id: '3', w: 'Spassky, Boris V', b: 'Fischer, Robert James', r: '1/2-1/2', d: '1972', e: 'World Championship', m: 'd4 Nf6' },
  { id: '4', w: 'Fischer, Robert James', b: 'Tal, Mihail', r: '0-1', d: '1959', e: 'Candidates', m: 'e4 e5 Nf3' },
]

describe('names', () => {
  it('formats PGN names', () => {
    expect(displayName('Fischer, Robert James')).toBe('Robert James Fischer')
    expect(displayName('Deep Blue')).toBe('Deep Blue')
    expect(surnameOf('Spassky, Boris V')).toBe('Spassky')
  })
})

describe('colorOf / outcomeFor', () => {
  it('works out colour and result for a player', () => {
    expect(colorOf(G[0], 'Fischer')).toBe('black')
    expect(outcomeFor(G[0], 'Fischer')).toBe('win')
    expect(outcomeFor(G[1], 'Fischer')).toBe('win')
    expect(outcomeFor(G[2], 'Fischer')).toBe('draw')
    expect(outcomeFor(G[3], 'Fischer')).toBe('loss')
    expect(outcomeFor(G[3], 'Tal')).toBe('win')
  })
  it('does not match part of a longer name', () => {
    expect(colorOf({ ...G[3], b: 'Talbot, X' }, 'Tal')).toBeNull()
  })
})

describe('searchGames', () => {
  it('filters by opponent text', () => {
    expect(searchGames(G, 'Fischer', { text: 'spassky' }).map((g) => g.id)).toEqual(['2', '3'])
  })
  it('combines several words', () => {
    expect(searchGames(G, 'Fischer', { text: 'spassky 1972 d59' }).map((g) => g.id)).toEqual(['2'])
  })
  it('filters by colour and outcome', () => {
    expect(searchGames(G, 'Fischer', { color: 'black' }).map((g) => g.id)).toEqual(['1', '3'])
    expect(searchGames(G, 'Fischer', { outcome: 'win' }).map((g) => g.id)).toEqual(['1', '2'])
    expect(searchGames(G, 'Fischer', { outcome: 'loss', color: 'white' }).map((g) => g.id)).toEqual(['4'])
  })
  it('returns everything with an empty search', () => {
    expect(searchGames(G, 'Fischer', {})).toHaveLength(4)
  })
})

describe('gameFrames', () => {
  it('replays the moves from the start', () => {
    const f = gameFrames(G[3])
    expect(f).toHaveLength(4)
    expect(f[0].fen).toBe(new Chess().fen())
    expect(f.map((x) => x.san)).toEqual([null, 'e4', 'e5', 'Nf3'])
    expect(f[3].move).toEqual({ from: 'g1', to: 'f3' })
  })
  it('supports a custom start position', () => {
    const fen = '8/P7/8/8/8/8/8/1k5K w - - 0 1'
    const f = gameFrames({ ...G[0], fen, m: 'a8=Q' })
    expect(f[1].san).toBe('a8=Q')
  })
})

describe('formatting', () => {
  it('formats dates', () => {
    expect(formatDate('1956-10-17')).toBe('Oct 17, 1956')
    expect(formatDate('1972-07')).toBe('Jul 1972')
    expect(formatDate('1972')).toBe('1972')
    expect(formatDate()).toBe('')
  })
  it('formats results and move counts', () => {
    expect(resultText('1/2-1/2')).toBe('½–½')
    expect(moveCount(G[3])).toBe(2)
  })
})

describe('eventKinds', () => {
  it('recognises the big events', () => {
    expect(eventKinds('World Championship 28th')).toEqual(['worldch'])
    expect(eventKinds('WCh 2024')).toEqual(['worldch'])
    expect(eventKinds('Candidats sf1')).toEqual(['candidates'])
    expect(eventKinds('41st Olympiad Open 2014')).toEqual(['olympiad'])
    expect(eventKinds('75th Tata Steel GpA')).toEqual(['elite'])
    expect(eventKinds('USA-ch')).toEqual(['national'])
  })
  it('flags fast chess, even at a World Championship', () => {
    expect(eventKinds('Titled Tue 4th Jul Late')).toEqual(['fast'])
    expect(eventKinds('World Blitz 2016')).toEqual(['fast'])
    expect(eventKinds('WCh Rapid TB 2016')).toEqual(['worldch', 'fast'])
    expect(eventKinds('chess.com Blitz Final 5m+2spm 2016')).toEqual(['fast'])
  })
  it('does not treat junior or women’s events as the World Championship', () => {
    expect(eventKinds('World Junior Championship')).not.toContain('worldch')
  })
  it('falls back to other', () => {
    expect(eventKinds('Club match')).toEqual(['other'])
    expect(eventKinds(undefined)).toEqual(['other'])
  })
})

describe('importance / sortGames', () => {
  const base = { r: '1-0', m: Array(60).fill('e4').join(' ') }
  const wch: Game = { ...base, id: 'w', w: 'Carlsen,M', b: 'Anand,V', e: 'WCh 2013', d: '2013-11-15' }
  const blitz: Game = { ...base, id: 'b', w: 'Carlsen,M', b: 'Anand,V', e: 'World Blitz 2016', d: '2016-12-29' }
  const club: Game = { ...base, id: 'c', w: 'Carlsen,M', b: 'Nobody,X', e: 'Club', d: '2001' }
  const shortDraw: Game = { ...base, id: 's', r: '1/2-1/2', m: 'e4 e5', w: 'Carlsen,M', b: 'Anand,V', e: 'Tata Steel', d: '2012' }

  it('ranks a World Championship win over blitz and club games', () => {
    expect(importance(wch, 'Carlsen')).toBeGreaterThan(importance(blitz, 'Carlsen'))
    expect(importance(wch, 'Carlsen')).toBeGreaterThan(importance(club, 'Carlsen'))
  })
  it('penalises short draws', () => {
    expect(importance(shortDraw, 'Carlsen')).toBeLessThan(importance({ ...shortDraw, r: '1-0', m: base.m }, 'Carlsen'))
  })
  it('puts famous games first', () => {
    const sorted = sortGames([wch, blitz, club], 'important', 'Carlsen', new Set(['c']))
    expect(sorted.map((g) => g.id)).toEqual(['c', 'w', 'b'])
  })
  it('sorts by date both ways', () => {
    expect(sortGames([wch, blitz, club], 'newest', 'Carlsen').map((g) => g.id)).toEqual(['b', 'w', 'c'])
    expect(sortGames([wch, blitz, club], 'oldest', 'Carlsen').map((g) => g.id)).toEqual(['c', 'w', 'b'])
  })
})

describe('gameEnding', () => {
  const g = (m: string, r: string, e = 'Tata Steel', fen?: string): Game => ({ id: 'x', w: 'A', b: 'B', r, e, m, fen })
  it('spots checkmate', () => {
    expect(gameEnding(g('e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#', '1-0'))).toBe('Checkmate. White wins.')
    expect(gameEnding(g('f3 e5 g4 Qh4#', '0-1'))).toBe('Checkmate. Black wins.')
  })
  it('says the loser resigned when there is no mate', () => {
    expect(gameEnding(g('e4 e5 Nf3', '1-0'))).toBe('Black resigned.')
    expect(gameEnding(g('e4 e5 Nf3', '0-1'))).toBe('White resigned.')
  })
  it('allows for time losses in fast games', () => {
    expect(gameEnding(g('e4 e5', '1-0', 'World Blitz 2016'))).toBe('Black resigned or lost on time.')
  })
  it('explains draws', () => {
    expect(gameEnding(g('d4 d5', '1/2-1/2'))).toBe('Draw agreed.')
    expect(gameEnding(g('Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8', '1/2-1/2'))).toBe('Draw by repetition.')
    expect(gameEnding(g('Kxb2', '1/2-1/2', 'x', '8/8/8/8/8/8/1p6/K6k w - - 0 1'))).toBe('Draw: not enough material left to checkmate.')
    expect(gameEnding(g('Qg6', '1/2-1/2', 'x', '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1'))).toBe('Draw by stalemate.')
  })
  it('handles an unknown result', () => {
    expect(gameEnding(g('e4', '*'))).toBe('Result not recorded.')
  })
})
