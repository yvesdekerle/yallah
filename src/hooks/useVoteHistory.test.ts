import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useVoteHistory } from './useVoteHistory.ts'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

const activity = (id: string): Activity => ({
  id,
  number: 1,
  title: id,
  tags: [],
  category: 'c',
  location: '',
  transit: '',
  description: '',
  price: '',
  rating: 0,
  pepite: false,
  secret: false,
})
const ACT = [activity('a1'), activity('a2'), activity('a3')]

beforeEach(() => {
  window.localStorage.clear()
})

describe('useVoteHistory', () => {
  it('appends votes and tracks the super-like quota (excluding quotaHit)', () => {
    const { result } = renderHook(() => useVoteHistory(ACT))
    expect(result.current.superRemaining).toBe(5)
    act(() => result.current.appendVote({ id: 'a1', verdict: 'top' }))
    expect(result.current.superRemaining).toBe(4)
    // A quota-downgraded entry never consumes quota.
    act(() =>
      result.current.appendVote({ id: 'a2', verdict: 'oui', quotaHit: true }),
    )
    expect(result.current.superRemaining).toBe(4)
  })

  it('upserts: appends a new id, replaces an existing one, drops a stale quotaHit', () => {
    const { result } = renderHook(() => useVoteHistory(ACT))
    act(() => result.current.upsertVote('a1', 'oui', { quotaHit: true }))
    expect(result.current.history).toEqual([
      { id: 'a1', verdict: 'oui', quotaHit: true },
    ])
    // Re-voting the same id replaces it wholesale — the stale quotaHit is gone.
    act(() => result.current.upsertVote('a1', 'top'))
    expect(result.current.history).toEqual([{ id: 'a1', verdict: 'top' }])
    // A different id appends.
    act(() => result.current.upsertVote('a2', 'non'))
    expect(result.current.history).toHaveLength(2)
  })

  it('allVoted is false with no activities and true once every id is voted', () => {
    const empty = renderHook(() => useVoteHistory([]))
    expect(empty.result.current.allVoted).toBe(false)

    const { result } = renderHook(() => useVoteHistory(ACT))
    expect(result.current.allVoted).toBe(false)
    act(() => {
      result.current.appendVote({ id: 'a1', verdict: 'oui' })
      result.current.appendVote({ id: 'a2', verdict: 'non' })
      result.current.appendVote({ id: 'a3', verdict: 'whynot' })
    })
    expect(result.current.allVoted).toBe(true)
  })

  it('randomFillVotes fills the missing ones, clamps supers to remaining quota, and is a no-op when complete', () => {
    // Pre-spend 4 of the 5 supers so the clamp caps the fill at 1 super-like.
    window.localStorage.setItem(
      'yallah.history.v1',
      JSON.stringify([
        { id: 'x1', verdict: 'top' },
        { id: 'x2', verdict: 'top' },
        { id: 'x3', verdict: 'top' },
        { id: 'x4', verdict: 'top' },
      ]),
    )
    const { result } = renderHook(() => useVoteHistory(ACT))
    expect(result.current.superRemaining).toBe(1)

    let added: VoteEntry[] = []
    act(() => {
      added = result.current.randomFillVotes()
    })
    expect(added).toHaveLength(3) // a1, a2, a3 (the x* ids aren't in ACT)
    const filledSupers = result.current.history.filter(
      (h) => h.id.startsWith('a') && h.verdict === 'top',
    )
    expect(filledSupers.length).toBeLessThanOrEqual(1)

    // Everything in ACT is now voted → randomFill is a no-op.
    act(() => {
      added = result.current.randomFillVotes()
    })
    expect(added).toEqual([])
  })

  it('undo, removeVotesFor and clearHistory mutate history', () => {
    const { result } = renderHook(() => useVoteHistory(ACT))
    act(() => {
      result.current.appendVote({ id: 'a1', verdict: 'oui' })
      result.current.appendVote({ id: 'a2', verdict: 'non' })
    })
    act(() => result.current.undoVote())
    expect(result.current.history).toHaveLength(1)
    act(() => result.current.removeVotesFor('a1'))
    expect(result.current.history).toHaveLength(0)
    act(() => result.current.appendVote({ id: 'a3', verdict: 'top' }))
    act(() => result.current.clearHistory())
    expect(result.current.history).toEqual([])
  })
})
