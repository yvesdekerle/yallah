import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

let emit: (v: string | null) => void = () => {}
const unsub = vi.fn()
const subscribeAppVersion = vi.fn((cb: (v: string | null) => void) => {
  emit = cb
  return unsub
})
const publishAppVersion = vi.fn(async (_v: string) => {})

vi.mock('../services/firebase/api.ts', () => ({
  subscribeAppVersion: (cb: (v: string | null) => void) =>
    subscribeAppVersion(cb),
  publishAppVersion: (v: string) => publishAppVersion(v),
}))

import { useVersionGate } from './useVersionGate.ts'
import { APP_VERSION } from '../constants/version.ts'

const reload = vi.fn()

beforeEach(() => {
  subscribeAppVersion.mockClear()
  publishAppVersion.mockClear()
  unsub.mockClear()
  reload.mockClear()
  sessionStorage.clear()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
    configurable: true,
  })
})

describe('useVersionGate', () => {
  it('does nothing when disabled', () => {
    renderHook(() => useVersionGate(false))
    expect(subscribeAppVersion).not.toHaveBeenCalled()
  })

  it('publishes this build when the DB has no version yet or an older one', () => {
    renderHook(() => useVersionGate(true))
    emit(null)
    expect(publishAppVersion).toHaveBeenLastCalledWith(APP_VERSION)
    emit('0.0.1')
    expect(publishAppVersion).toHaveBeenLastCalledWith(APP_VERSION)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload or publish when the DB version equals this build', () => {
    renderHook(() => useVersionGate(true))
    emit(APP_VERSION)
    expect(reload).not.toHaveBeenCalled()
    expect(publishAppVersion).not.toHaveBeenCalled()
  })

  it('reloads once when a newer version is published, then guards against loops', () => {
    renderHook(() => useVersionGate(true))
    emit('99.0.0')
    expect(reload).toHaveBeenCalledTimes(1)
    // A repeat snapshot of the same newer version must NOT reload again.
    emit('99.0.0')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useVersionGate(true))
    unmount()
    expect(unsub).toHaveBeenCalledTimes(1)
  })
})
