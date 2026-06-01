import { describe, it, expect } from 'vitest'
import { fakeVote } from './groupVotes.ts'

describe('fakeVote', () => {
  it('returns the same verdict for the same (participant, activity) pair', () => {
    const a = fakeVote('alex', 'a001')
    const b = fakeVote('alex', 'a001')
    expect(a).toBe(b)
  })

  it('returns different verdicts for different activities', () => {
    const seen = new Set<string>()
    for (let i = 1; i <= 50; i++) {
      const id = `a${i.toString().padStart(3, '0')}`
      seen.add(fakeVote('alex', id))
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('returns one of the five known verdicts', () => {
    const valid = new Set(['oui', 'non', 'whynot', 'top', 'skip'])
    for (let i = 0; i < 50; i++) {
      expect(valid.has(fakeVote(`p${i}`, 'a042'))).toBe(true)
    }
  })
})
