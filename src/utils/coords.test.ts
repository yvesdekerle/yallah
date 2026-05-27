import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the two JSON imports BEFORE importing the module under test.
vi.mock('../data/coords.json', () => ({
  default: {
    a001: { lat: -20.443, lng: 57.715, source: 'nominatim' },
    a002: null,
    a003: { lat: -20.5, lng: 57.5, source: 'nominatim' },
  },
}))
vi.mock('../data/coords-overrides.json', () => ({
  default: {
    a002: { lat: -20.111, lng: 57.222 },
    a003: { lat: -20.999, lng: 57.999 },
  },
}))

import { getCoords } from './coords.ts'

describe('getCoords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns coords from coords.json when no override exists', () => {
    expect(getCoords('a001')).toEqual({ lat: -20.443, lng: 57.715 })
  })

  it('returns override coords when present (even if coords.json has null)', () => {
    expect(getCoords('a002')).toEqual({ lat: -20.111, lng: 57.222 })
  })

  it('overrides win over a populated coords.json entry', () => {
    expect(getCoords('a003')).toEqual({ lat: -20.999, lng: 57.999 })
  })

  it('returns null for an unknown activity', () => {
    expect(getCoords('a999')).toBeNull()
  })
})
