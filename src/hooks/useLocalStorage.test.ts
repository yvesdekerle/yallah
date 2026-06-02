import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage.ts'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default when no value is stored', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 7),
    )
    expect(result.current[0]).toBe(7)
  })

  it('reads an existing value from storage', () => {
    window.localStorage.setItem('test.count', JSON.stringify(42))
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 0),
    )
    expect(result.current[0]).toBe(42)
  })

  it('persists a new value', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 0),
    )
    act(() => result.current[1](3))
    expect(result.current[0]).toBe(3)
    expect(JSON.parse(window.localStorage.getItem('test.count')!)).toBe(3)
  })

  it('supports the functional updater form', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 1),
    )
    act(() => result.current[1]((prev) => prev + 10))
    expect(result.current[0]).toBe(11)
  })

  it('falls back to the default when parsing fails', () => {
    window.localStorage.setItem('test.json', '{not json')
    const { result } = renderHook(() =>
      useLocalStorage<{ ok: boolean }>('test.json', { ok: false }),
    )
    expect(result.current[0]).toEqual({ ok: false })
  })

  it('reflects cross-tab changes via the storage event', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 0),
    )
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'test.count',
          newValue: JSON.stringify(99),
        }),
      )
    })
    expect(result.current[0]).toBe(99)
  })

  it('reverts to default when another tab clears the key', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number>('test.count', 5),
    )
    act(() => result.current[1](42))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'test.count', newValue: null }),
      )
    })
    expect(result.current[0]).toBe(5)
  })

  it('keeps the in-memory value when setItem throws (quota / private mode)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      })
    const { result } = renderHook(() => useLocalStorage<number>('test.count', 0))
    expect(() => {
      act(() => result.current[1](5))
    }).not.toThrow()
    // The write was attempted (guards against a future no-write refactor
    // passing this test vacuously) but the failure was swallowed.
    expect(spy).toHaveBeenCalledWith('test.count', JSON.stringify(5))
    expect(result.current[0]).toBe(5)
    spy.mockRestore()
  })

  it('falls back to the default when a storage event carries unparsable JSON', () => {
    const { result } = renderHook(() => useLocalStorage<number>('test.count', 7))
    act(() => result.current[1](42))
    expect(result.current[0]).toBe(42)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'test.count',
          newValue: '{not json',
        }),
      )
    })
    expect(result.current[0]).toBe(7)
  })

  it('keeps the in-memory value when removeItem throws on a null reset', () => {
    const { result } = renderHook(() =>
      useLocalStorage<number | null>('test.count', 0),
    )
    act(() => result.current[1](42))
    const spy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('SecurityError', 'SecurityError')
      })
    expect(() => {
      act(() => result.current[1](null))
    }).not.toThrow()
    expect(result.current[0]).toBeNull()
    spy.mockRestore()
  })
})
