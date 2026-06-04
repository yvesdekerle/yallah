import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  compareVersions,
  reloadIfOutdated,
  RELOADED_FOR_KEY,
} from './version.ts'

describe('compareVersions', () => {
  it('orders by numeric segments (not lexicographically)', () => {
    expect(compareVersions('1.0.3', '1.0.4')).toBe(-1)
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1) // 10 > 9, not "1" < "9"
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
  })

  it('treats equal versions as 0 and pads shorter ones', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.1', '1.0')).toBe(1)
  })

  it('treats malformed segments as 0', () => {
    expect(compareVersions('1.x.0', '1.0.0')).toBe(0)
    expect(compareVersions('', '0.0.0')).toBe(0)
  })
})

describe('reloadIfOutdated', () => {
  const reload = vi.fn()

  beforeEach(() => {
    reload.mockClear()
    sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
      configurable: true,
    })
  })

  it('reloads once when the remote version is newer', () => {
    expect(reloadIfOutdated('1.0.6', '1.0.5')).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(RELOADED_FOR_KEY)).toBe('1.0.6')
  })

  it('does nothing when the remote version is equal or older', () => {
    expect(reloadIfOutdated('1.0.5', '1.0.5')).toBe(false)
    expect(reloadIfOutdated('1.0.4', '1.0.5')).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads only once per target version (loop guard)', () => {
    sessionStorage.setItem(RELOADED_FOR_KEY, '1.0.6')
    expect(reloadIfOutdated('1.0.6', '1.0.5')).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
