import { describe, expect, it } from 'vitest'
import { hrefFor, parseHash } from './useHashRoute'

describe('parseHash', () => {
  it('reads route and params', () => {
    expect(parseHash('#/games/fischer/abc')).toEqual({ route: 'games', params: ['fischer', 'abc'] })
    expect(parseHash('#/board')).toEqual({ route: 'board', params: [] })
  })
  it('defaults to puzzles', () => {
    expect(parseHash('')).toEqual({ route: 'puzzles', params: [] })
    expect(parseHash('#/nope/x')).toEqual({ route: 'puzzles', params: [] })
  })
  it('round-trips with hrefFor', () => {
    const href = hrefFor('games', 'ding', 'a b')
    expect(href).toBe('#/games/ding/a%20b')
    expect(parseHash(href)).toEqual({ route: 'games', params: ['ding', 'a b'] })
  })
})
