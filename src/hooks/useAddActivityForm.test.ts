import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Activity } from '../types/activity.ts'
import { useAddActivityForm } from './useAddActivityForm.ts'

// Curated activities are injected (no longer a static import) — the category /
// tag palettes derive from this fixture, so the 🌊 assertion is self-contained.
const CURATED: Activity[] = [
  {
    id: 'a001',
    number: 1,
    title: 'Plage',
    tags: ['🌊'],
    category: 'Plage',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 0,
    pepite: false,
    secret: false,
  },
]

function setup() {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const view = renderHook(() =>
    useAddActivityForm({
      curatedActivities: CURATED,
      userActivities: [],
      onAdd,
      onUpdate,
    }),
  )
  return { ...view, onAdd, onUpdate }
}

describe('useAddActivityForm — pépite / secret as the single source for 💎 / 🗝️', () => {
  it('keeps 💎 and 🗝️ out of the tag palette (they are toggle-controlled)', () => {
    const { result } = setup()
    expect(result.current.tagPalette).not.toContain('💎')
    expect(result.current.tagPalette).not.toContain('🗝️')
    // Regular emoji tags are still offered.
    expect(result.current.tagPalette).toContain('🌊')
  })

  it('injects 💎/🗝️ at the front of tags from the toggles on submit', async () => {
    const { result, onAdd } = setup()
    act(() => {
      result.current.setFields((s) => ({
        ...s,
        title: 'Test',
        tags: ['🌊'],
        pepite: true,
        secret: true,
      }))
    })
    await act(async () => {
      await result.current.submit()
    })
    expect(onAdd).toHaveBeenCalledTimes(1)
    const input = onAdd.mock.calls[0]![0]
    expect(input.tags[0]).toBe('💎')
    expect(input.tags).toContain('🗝️')
    expect(input.tags).toContain('🌊')
    expect(input.pepite).toBe(true)
    expect(input.secret).toBe(true)
  })

  it('surfaces an error and keeps the form when submit fails (e.g. photo decode)', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('decode failed'))
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAddActivityForm({
        curatedActivities: CURATED,
        userActivities: [],
        onAdd,
        onUpdate,
      }),
    )
    act(() => {
      result.current.setFields((s) => ({ ...s, title: 'Test' }))
    })
    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.submitError).not.toBe('')
    // The form is kept (not reset) so the user can retry / remove a photo.
    expect(result.current.fields.title).toBe('Test')
    expect(result.current.saving).toBe(false)
  })

  it('defaults groupMode to subgroup and carries no size on submit', async () => {
    const { result, onAdd } = setup()
    act(() => {
      result.current.setFields((s) => ({ ...s, title: 'Test' }))
    })
    await act(async () => {
      await result.current.submit()
    })
    const input = onAdd.mock.calls[0]![0]
    expect(input.groupMode).toBe('subgroup')
    expect(input.groupSize).toBeUndefined()
  })

  it('carries a participant cap only for a limited format', async () => {
    const { result, onAdd } = setup()
    act(() => {
      result.current.setFields((s) => ({ ...s, title: 'Plongée' }))
      result.current.setGroupMode('limited')
      result.current.setGroupSize(6)
    })
    await act(async () => {
      await result.current.submit()
    })
    const input = onAdd.mock.calls[0]![0]
    expect(input.groupMode).toBe('limited')
    expect(input.groupSize).toBe(6)
  })

  it('drops the cap when the format is not limited', async () => {
    const { result, onAdd } = setup()
    act(() => {
      result.current.setFields((s) => ({ ...s, title: 'Rando' }))
      result.current.setGroupMode('all')
      result.current.setGroupSize(6)
    })
    await act(async () => {
      await result.current.submit()
    })
    const input = onAdd.mock.calls[0]![0]
    expect(input.groupMode).toBe('all')
    expect(input.groupSize).toBeUndefined()
  })

  it('derives the city (Lieu) from a newly picked position', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: { village: 'Tamarin' } }),
      }),
    )
    try {
      const { result } = setup()
      act(() => {
        result.current.setCoords({ lat: -20.32, lng: 57.37 })
      })
      // Debounced (1.1 s) reverse-geocode, then async fill.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200)
      })
      expect(result.current.fields.location).toBe('Tamarin')
    } finally {
      vi.useRealTimers()
      vi.restoreAllMocks()
    }
  })

  it('clears the derived city when the position is cleared', () => {
    const { result } = setup()
    act(() => {
      result.current.setFields((s) => ({ ...s, location: 'Tamarin' }))
    })
    expect(result.current.fields.location).toBe('Tamarin')
    act(() => {
      result.current.setCoords(null)
    })
    expect(result.current.fields.location).toBe('')
  })

  it('strips a stale 💎 from tags when the pépite toggle is off', async () => {
    const { result, onAdd } = setup()
    act(() => {
      result.current.setFields((s) => ({
        ...s,
        title: 'Test',
        tags: ['🌊', '💎'],
        pepite: false,
      }))
    })
    await act(async () => {
      await result.current.submit()
    })
    const input = onAdd.mock.calls[0]![0]
    expect(input.tags).toContain('🌊')
    expect(input.tags).not.toContain('💎')
  })
})
