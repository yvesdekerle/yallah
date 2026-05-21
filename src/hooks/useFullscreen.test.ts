import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useFullscreen } from './useFullscreen.ts'

describe('useFullscreen', () => {
  let originalRequest: typeof document.documentElement.requestFullscreen
  let originalExit: typeof document.exitFullscreen

  beforeEach(() => {
    originalRequest = document.documentElement.requestFullscreen
    originalExit = document.exitFullscreen
    // jsdom does not implement the API — stub it so `supported` is true.
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: vi.fn(() => Promise.resolve()),
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      writable: true,
      value: vi.fn(() => Promise.resolve()),
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    })
  })

  afterEach(() => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: originalRequest,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      writable: true,
      value: originalExit,
    })
  })

  it('reports supported when the API is available', () => {
    const { result } = renderHook(() => useFullscreen())
    expect(result.current.supported).toBe(true)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('calls requestFullscreen on toggle when not already fullscreen', () => {
    const { result } = renderHook(() => useFullscreen())
    act(() => result.current.toggle())
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
  })

  it('calls exitFullscreen on toggle when in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: document.documentElement,
    })
    const { result } = renderHook(() => useFullscreen())
    act(() => result.current.toggle())
    expect(document.exitFullscreen).toHaveBeenCalled()
  })

  it('reflects fullscreenchange events', () => {
    const { result } = renderHook(() => useFullscreen())
    expect(result.current.isFullscreen).toBe(false)
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: document.documentElement,
      })
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)
  })
})
