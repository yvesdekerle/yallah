import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

// a001 & a002 have coords; everything else (incl. a003) does not.
vi.mock('../utils/coords.ts', () => ({
  coordsFor: (a: Activity) =>
    a.id === 'a001' || a.id === 'a002' ? { lat: -20.2, lng: 57.5 } : null,
}))

import { useMapPins } from './useMapPins.ts'

const make = (n: number): Activity => ({
  id: `a${n.toString().padStart(3, '0')}`,
  number: n,
  title: `Activity ${n}`,
  tags: [],
  category: 'Test',
  location: 'L',
  transit: '~10 min',
  description: 'd',
  price: '10 €',
  rating: 5,
  pepite: false,
  secret: false,
})

const ACTIVITIES = [make(1), make(2), make(3)]

describe('useMapPins', () => {
  it('keeps only liked/super-liked activities that have coords, deduped', () => {
    const history: VoteEntry[] = [
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'top' },
      { id: 'a003', verdict: 'oui' }, // no coords → dropped
      { id: 'a001', verdict: 'oui' }, // duplicate id → deduped
    ]
    const { result } = renderHook(() => useMapPins(history, ACTIVITIES))
    expect(result.current.likedPins.map((p) => p.activity.id)).toEqual([
      'a001',
      'a002',
    ])
    expect(
      result.current.likedPins.find((p) => p.activity.id === 'a002')?.verdict,
    ).toBe('top')
  })

  it('ignores non/whynot verdicts and unknown activity ids', () => {
    const history: VoteEntry[] = [
      { id: 'a001', verdict: 'non' },
      { id: 'a001', verdict: 'whynot' },
      { id: 'zzz', verdict: 'oui' }, // unknown id
    ]
    const { result } = renderHook(() => useMapPins(history, ACTIVITIES))
    expect(result.current.likedPins).toEqual([])
  })

  it('singleMapPin returns [] for an unknown id or one without coords', () => {
    const { result } = renderHook(() => useMapPins([], ACTIVITIES))
    expect(result.current.singleMapPin('zzz')).toEqual([]) // unknown
    expect(result.current.singleMapPin('a003')).toEqual([]) // no coords
  })

  it('singleMapPin reuses an existing like/super verdict, else defaults to oui', () => {
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'top' }]
    const { result } = renderHook(() => useMapPins(history, ACTIVITIES))
    expect(result.current.singleMapPin('a001')[0]?.verdict).toBe('top')
    // a002 has coords but no vote → defaults to 'oui'
    expect(result.current.singleMapPin('a002')[0]?.verdict).toBe('oui')
  })

  it('singleMapPin defaults to oui when the existing vote is non/whynot', () => {
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'non' }]
    const { result } = renderHook(() => useMapPins(history, ACTIVITIES))
    expect(result.current.singleMapPin('a001')[0]?.verdict).toBe('oui')
  })
})
