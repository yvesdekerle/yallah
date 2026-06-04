import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDeployedVersionPoll } from './useDeployedVersionPoll.ts'
import { APP_VERSION } from '../constants/version.ts'
import { RELOADED_FOR_KEY } from '../utils/version.ts'

const reload = vi.fn()

function mockVersionResponse(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  reload.mockClear()
  sessionStorage.clear()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDeployedVersionPoll', () => {
  it('reloads when version.json advertises a newer build', async () => {
    const next = `${APP_VERSION}.9` // strictly newer (extra segment)
    vi.stubGlobal('fetch', mockVersionResponse({ version: next }))
    renderHook(() => useDeployedVersionPoll())
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem(RELOADED_FOR_KEY)).toBe(next)
  })

  it('does not reload when version.json matches the running build', async () => {
    const fetchMock = mockVersionResponse({ version: APP_VERSION })
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useDeployedVersionPoll())
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(reload).not.toHaveBeenCalled()
  })

  it('ignores a malformed body without throwing', async () => {
    const fetchMock = mockVersionResponse({ nope: true })
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useDeployedVersionPoll())
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(reload).not.toHaveBeenCalled()
  })

  it('swallows fetch failures (offline / 404)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useDeployedVersionPoll())
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(reload).not.toHaveBeenCalled()
  })
})
