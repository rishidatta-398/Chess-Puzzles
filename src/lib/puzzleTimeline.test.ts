import { describe, expect, it } from 'vitest'
import { fromCompact, preparePuzzle } from './puzzles'
import { buildTimeline, lastViewable, step } from './puzzleTimeline'
import { attemptMove, hintSquare, playReply, startSolver, takeHint } from './puzzleSolver'

const LADDER = preparePuzzle(fromCompact(['m2', '7k/8/8/8/8/8/1R6/R5K1 b - - 0 1', 'h8g8 b2b7 g8f8 a1a8', 800, '']))

describe('buildTimeline', () => {
  it('starts before the setup move', () => {
    const t = buildTimeline(LADDER)
    expect(t).toHaveLength(5) // before setup, after setup, 3 solution moves
    expect(t[0]).toMatchObject({ fen: '7k/8/8/8/8/8/1R6/R5K1 b - - 0 1', move: null })
    expect(t[1]).toMatchObject({ san: 'Kg8', move: { from: 'h8', to: 'g8' } })
    expect(t[1].fen).toBe(LADDER.startFen)
    expect(t.map((f) => f.san)).toEqual([null, 'Kg8', 'Rb7', 'Kf8', 'Ra8#'])
  })
})

describe('lastViewable', () => {
  const t = buildTimeline(LADDER)
  it('only allows positions already reached while solving', () => {
    expect(lastViewable(t, 0, false)).toBe(1)
    expect(lastViewable(t, 2, false)).toBe(3)
  })
  it('allows the whole line when finished', () => {
    expect(lastViewable(t, 0, true)).toBe(4)
  })
})

describe('step', () => {
  it('goes back from live and returns to live', () => {
    expect(step(null, -1, 1)).toBe(0) // live at 1 → before the setup move
    expect(step(0, 1, 1)).toBeNull() // back to live
  })
  it('clamps at both ends', () => {
    expect(step(0, -1, 3)).toBe(0)
    expect(step(null, 1, 3)).toBeNull()
  })
  it('walks the full line after finishing', () => {
    let v: number | null = null
    const seq: (number | null)[] = []
    for (let i = 0; i < 5; i++) seq.push((v = step(v, -1, 4)))
    expect(seq).toEqual([3, 2, 1, 0, 0])
  })
})

describe('hints', () => {
  it('points at the piece to move, then the next one after the reply', () => {
    const s = startSolver(LADDER)
    expect(hintSquare(s)).toBe('b2')
    const r = attemptMove(s, 'b2', 'b7')
    if (r.kind !== 'correct') throw new Error('expected correct')
    expect(hintSquare(playReply(r.state))).toBe('a1')
  })
  it('using a hint means not solved first try', () => {
    const s = takeHint(startSolver(LADDER))
    expect(s.hinted).toBe(true)
    expect(s.failed).toBe(true)
  })
})
