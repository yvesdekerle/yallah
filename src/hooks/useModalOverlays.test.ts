import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useModalOverlays } from './useModalOverlays.ts'

describe('useModalOverlays', () => {
  it('openMapAboveDetail sets the view and raises the above-detail flag', () => {
    const { result } = renderHook(() => useModalOverlays())
    act(() => result.current.openMapAboveDetail({ mode: 'all' }))
    expect(result.current.mapView).toEqual({ mode: 'all' })
    expect(result.current.mapAboveDetail).toBe(true)
  })

  it('closeMap clears the view and lowers the flag', () => {
    const { result } = renderHook(() => useModalOverlays())
    act(() =>
      result.current.openMapAboveDetail({ mode: 'single', activityId: 'a1' }),
    )
    act(() => result.current.closeMap())
    expect(result.current.mapView).toBeNull()
    expect(result.current.mapAboveDetail).toBe(false)
  })
})
