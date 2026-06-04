import { describe, it, expect } from 'vitest'
import { compareVersions } from './version.ts'

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
