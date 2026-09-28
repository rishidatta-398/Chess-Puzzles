import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module without type declarations
import { FAMOUS, findFamous } from './famous.mjs'
// @ts-expect-error plain JS module without type declarations
import { clean, displayName, gameId, moveText, nameMatches, normalizeDate, parseHeaders, splitPgn } from './pgn.mjs'

const TWO_GAMES = `[Event "Test Open"]
[Site "Somewhere"]
[Date "1999.01.20"]
[Round "4"]
[White "Alpha, Ann"]
[Black "Beta, Bob"]
[Result "1-0"]
[ECO "C20"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0

[Event "Test Open"]
[Date "1999.??.??"]
[White "Beta, Bob"]
[Black "Alpha, Ann"]
[Result "1/2-1/2"]

1. d4 {a comment} d5 2. c4 (2. Nf3 Nf6) e6 1/2-1/2
`

describe('splitPgn', () => {
  it('splits a collection into games', () => {
    const games = splitPgn(TWO_GAMES)
    expect(games).toHaveLength(2)
    expect(games[0]).toContain('Qxf7#')
    expect(games[1]).toContain('1. d4')
  })
  it('handles Windows line endings and blank input', () => {
    expect(splitPgn(TWO_GAMES.replace(/\n/g, '\r\n'))).toHaveLength(2)
    expect(splitPgn('   \n\n')).toEqual([])
  })
})

describe('parseHeaders / moveText', () => {
  const [g1] = splitPgn(TWO_GAMES)
  it('reads headers', () => {
    expect(parseHeaders(g1)).toMatchObject({ Event: 'Test Open', White: 'Alpha, Ann', Result: '1-0', ECO: 'C20', Round: '4' })
  })
  it('returns just the moves', () => {
    expect(moveText(g1)).toBe('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
  })
  it('handles escaped quotes', () => {
    expect(parseHeaders('[Event "The \\"Big\\" One"]').Event).toBe('The "Big" One')
  })
})

describe('normalizeDate', () => {
  it('handles full, partial and missing dates', () => {
    expect(normalizeDate('1956.10.17')).toBe('1956-10-17')
    expect(normalizeDate('1956.10.??')).toBe('1956-10')
    expect(normalizeDate('1956.??.??')).toBe('1956')
    expect(normalizeDate('????.??.??')).toBe('')
    expect(normalizeDate(undefined)).toBe('')
  })
})

describe('names', () => {
  it('turns "Last, First" around', () => {
    expect(displayName('Fischer, Robert James')).toBe('Robert James Fischer')
    expect(displayName('Carlsen,M')).toBe('M Carlsen')
    expect(displayName('Deep Blue')).toBe('Deep Blue')
    expect(displayName('?')).toBe('')
  })
  it('matches surnames as whole words', () => {
    expect(nameMatches('Byrne, Donald', 'Byrne')).toBe(true)
    expect(nameMatches('Tal, Mihail', 'Tal')).toBe(true)
    expect(nameMatches('Talbot, X', 'Tal')).toBe(false)
  })
  it('cleans placeholder values', () => {
    expect(clean('?')).toBe('')
    expect(clean(' Paris ')).toBe('Paris')
  })
})

describe('gameId', () => {
  it('is the same regardless of first names', () => {
    const a = gameId('Karpov, Anatoly', 'Kasparov, Garry', '1985-10-15', ['e4', 'c5'])
    const b = gameId('Karpov, A.', 'Kasparov, G.', '1985', ['e4', 'c5'])
    expect(a).toBe(b)
  })
  it('differs for different games', () => {
    expect(gameId('A', 'B', '2000', ['e4'])).not.toBe(gameId('A', 'B', '2000', ['d4']))
  })
})

/** Fake move list with `san` at 1-based `ply`. */
const withMove = (ply: number, san: string) => {
  const m = Array(ply + 4).fill('x')
  m[ply - 1] = san
  return m.join(' ')
}

describe('findFamous', () => {
  const games = [
    { w: 'Byrne, Donald', b: 'Fischer, Robert James', d: '1956-10-17', e: 'Rosenwald Memorial', rd: '8', m: withMove(34, 'Be6') },
    { w: 'Fischer, Robert James', b: 'Byrne, Donald', d: '1957-01-01', e: 'US Ch' },
    { w: 'Fischer, Robert James', b: 'Spassky, Boris V', d: '1972-07-23', e: 'World Championship', rd: '6' },
    { w: 'Fischer, Robert James', b: 'Spassky, Boris V', d: '1972-08-10', e: 'World Championship', rd: '16' },
  ]
  const spec = (id: string) => FAMOUS.find((f: { id: string }) => f.id === id)
  it('finds a game by players and year', () => {
    expect(findFamous(games, spec('game-of-the-century'))).toEqual([games[0]])
  })
  it('uses the round to pick one match game', () => {
    expect(findFamous(games, spec('fischer-spassky-6'))).toEqual([games[2]])
  })
  it('accepts any of several names for a side', () => {
    const opera = [{ w: 'Morphy, Paul', b: 'Duke Karl / Count Isouard', d: '1858', e: 'Paris', m: withMove(33, 'Rd8#') }]
    expect(findFamous(opera, spec('opera-game'))).toHaveLength(1)
  })
  it('rejects a game whose signature move is different', () => {
    const wrong = [{ ...games[0], m: withMove(34, 'Qb6') }]
    expect(findFamous(wrong, spec('game-of-the-century'))).toEqual([])
  })
  it('filters by result when given', () => {
    const capa = { w: 'Capablanca, Jose Raul', b: 'Tartakower, Saviely', d: '1924', e: 'New York', m: 'e4' }
    expect(findFamous([{ ...capa, r: '1/2-1/2' }, { ...capa, r: '1-0' }], spec('capablanca-tartakower-1924'))).toHaveLength(1)
  })
  it('every famous game has a note and a known player', () => {
    for (const f of FAMOUS) {
      expect(f.note.length).toBeGreaterThan(20)
      expect(f.year).toMatch(/^\d{4}$/)
    }
  })
})
