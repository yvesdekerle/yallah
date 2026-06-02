import { describe, it, expect } from 'vitest'
import { migrateHistory, type LegacyVoteEntry } from './history.ts'
import type { VoteEntry } from '../types/verdict.ts'

describe('migrateHistory', () => {
  it('rewrites legacy "neutre" verdicts to "whynot"', () => {
    const legacy: LegacyVoteEntry[] = [{ id: 'a001', verdict: 'neutre' }]
    expect(migrateHistory(legacy)).toEqual([{ id: 'a001', verdict: 'whynot' }])
  })

  it('passes non-legacy verdicts through unchanged', () => {
    const h: VoteEntry[] = [
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'top', quotaHit: true },
    ]
    expect(migrateHistory(h)).toEqual(h)
  })

  it('preserves quotaHit when migrating a neutre entry', () => {
    const legacy: LegacyVoteEntry[] = [
      { id: 'a001', verdict: 'neutre', quotaHit: true },
    ]
    expect(migrateHistory(legacy)).toEqual([
      { id: 'a001', verdict: 'whynot', quotaHit: true },
    ])
  })

  it('drops removed "skip" (plus tard) verdicts', () => {
    const legacy: LegacyVoteEntry[] = [
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'skip' },
      { id: 'a003', verdict: 'whynot' },
    ]
    expect(migrateHistory(legacy)).toEqual([
      { id: 'a001', verdict: 'oui' },
      { id: 'a003', verdict: 'whynot' },
    ])
  })

  it('returns an empty array for empty history', () => {
    expect(migrateHistory([])).toEqual([])
  })
})
