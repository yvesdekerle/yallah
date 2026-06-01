import { describe, it, expect } from 'vitest'
import { ratingComment } from './rating.ts'

describe('ratingComment', () => {
  it('returns a non-empty comment for ratings 1 through 5', () => {
    for (const r of [1, 2, 3, 4, 5]) {
      const c = ratingComment(r)
      expect(c).not.toBeNull()
      expect(c!.length).toBeGreaterThan(0)
    }
  })

  it('returns null for unknown integers', () => {
    expect(ratingComment(0)).toBeNull()
    expect(ratingComment(6)).toBeNull()
  })

  it('rounds non-integer ratings to the nearest bucket', () => {
    expect(ratingComment(4.4)).toBe(ratingComment(4))
    expect(ratingComment(4.6)).toBe(ratingComment(5))
  })
})
