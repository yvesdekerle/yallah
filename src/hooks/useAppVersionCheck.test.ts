import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppVersionCheck } from './useAppVersionCheck.ts'
import { APP_VERSION, APP_VERSION_KEY } from '../constants/version.ts'

describe('useAppVersionCheck', () => {
  beforeEach(() => localStorage.clear())

  it('persists the current version on first run and does not signal an upgrade', () => {
    const onUpgrade = vi.fn()
    renderHook(() => useAppVersionCheck(onUpgrade))
    expect(onUpgrade).not.toHaveBeenCalled()
    expect(localStorage.getItem(APP_VERSION_KEY)).toBe(APP_VERSION)
  })

  it('signals an upgrade + records the new version when the stored one differs', () => {
    localStorage.setItem(APP_VERSION_KEY, '0.0.1')
    const onUpgrade = vi.fn()
    renderHook(() => useAppVersionCheck(onUpgrade))
    expect(onUpgrade).toHaveBeenCalledWith(APP_VERSION)
    expect(localStorage.getItem(APP_VERSION_KEY)).toBe(APP_VERSION)
  })

  it('does nothing when the stored version already matches', () => {
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION)
    const onUpgrade = vi.fn()
    renderHook(() => useAppVersionCheck(onUpgrade))
    expect(onUpgrade).not.toHaveBeenCalled()
  })
})
