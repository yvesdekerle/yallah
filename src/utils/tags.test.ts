import { describe, it, expect } from 'vitest'
import { labelForTag, TAG_LABELS } from './tags.ts'

describe('labelForTag', () => {
  it('returns the French label for a known emoji tag', () => {
    expect(labelForTag('🌊')).toBe('Mer & sports nautiques')
    expect(labelForTag('💎')).toBe(TAG_LABELS['💎'])
  })

  it('returns the tag itself when unknown', () => {
    expect(labelForTag('🦄')).toBe('🦄')
    expect(labelForTag('')).toBe('')
  })
})
