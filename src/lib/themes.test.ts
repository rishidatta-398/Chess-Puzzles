import { expect, it } from 'vitest'
import { humanize } from './themes'

it('turns Lichess theme ids into words', () => {
  expect(humanize('mateIn2')).toBe('Mate in 2')
  expect(humanize('backRankMate')).toBe('Back rank mate')
  expect(humanize('fork')).toBe('Fork')
})
