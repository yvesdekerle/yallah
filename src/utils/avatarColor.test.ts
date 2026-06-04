import { describe, it, expect } from 'vitest'
import { avatarColor } from './avatarColor.ts'

const HEX = /^#[0-9A-F]{6}$/i

describe('avatarColor', () => {
  it('is deterministic for the same id', () => {
    expect(avatarColor('uid-123')).toBe(avatarColor('uid-123'))
  })

  it('always returns a palette hex colour', () => {
    for (const id of ['a', 'yves', 'uid-xyz', '', '🙂']) {
      expect(avatarColor(id)).toMatch(HEX)
    }
  })

  it('spreads different ids across more than one colour', () => {
    const colours = new Set(
      Array.from({ length: 30 }, (_, i) => avatarColor(`user-${i}`)),
    )
    expect(colours.size).toBeGreaterThan(1)
  })
})
