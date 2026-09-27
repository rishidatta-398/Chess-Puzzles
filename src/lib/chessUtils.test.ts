import { describe, expect, it } from 'vitest'
import { legalTargets, sideToMove, statusText, tryMove } from './chessUtils'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('legalTargets', () => {
  it('lists knight moves from the start', () => {
    expect(legalTargets(START, 'g1').sort()).toEqual(['f3', 'h3'])
  })
  it('returns nothing for the side not to move', () => {
    expect(legalTargets(START, 'e7')).toEqual([])
  })
  it('returns nothing for an empty square', () => {
    expect(legalTargets(START, 'e4')).toEqual([])
  })
})

describe('tryMove', () => {
  it('plays a legal move', () => {
    const r = tryMove(START, 'e2', 'e4')
    expect(r?.san).toBe('e4')
    expect(sideToMove(r!.fen)).toBe('black')
  })
  it('rejects an illegal move', () => {
    expect(tryMove(START, 'e2', 'e5')).toBeNull()
  })
  it('promotes to a queen by default', () => {
    const fen = '8/P7/8/8/8/8/8/1k5K w - - 0 1'
    expect(tryMove(fen, 'a7', 'a8')?.san).toBe('a8=Q')
  })
  it('can underpromote', () => {
    const fen = '8/P7/8/8/8/8/8/1k5K w - - 0 1'
    expect(tryMove(fen, 'a7', 'a8', 'n')?.san).toBe('a8=N')
  })
})

describe('statusText', () => {
  it('reports the side to move', () => {
    expect(statusText(START)).toBe('White to move.')
  })
  it('detects checkmate', () => {
    // Fool's mate
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(statusText(fen)).toBe('Checkmate. Black wins.')
  })
  it('detects stalemate', () => {
    expect(statusText('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe('Stalemate. Draw.')
  })
})
