import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAddActivityForm } from './useAddActivityForm.ts'

function setup() {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const view = renderHook(() =>
    useAddActivityForm({ userActivities: [], onAdd, onUpdate }),
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
