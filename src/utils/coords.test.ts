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

import { getCoords, coordsFor } from './coords.ts'
import type { Activity } from '../types/activity.ts'

const make = (over: Partial<Activity>): Activity => ({
  id: 'a001',
  number: 1,
  title: 't',
  tags: [],
  category: 'c',
  location: 'l',
  transit: 't',
  description: 'd',
  price: 'p',
  rating: 5,
  pepite: false,
  secret: false,
  ...over,
})

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

describe('coordsFor', () => {
  it('prefers the activity own coords (user-added)', () => {
    const a = make({ id: 'u-1', userAdded: true, coords: { lat: -20.3, lng: 57.4 } })
    expect(coordsFor(a)).toEqual({ lat: -20.3, lng: 57.4 })
  })

  it('falls back to getCoords by id when activity has no coords', () => {
    expect(coordsFor(make({ id: 'a001' }))).toEqual({ lat: -20.443, lng: 57.715 })
  })

  it('returns null when neither the activity nor the data has coords', () => {
    expect(coordsFor(make({ id: 'u-x', userAdded: true }))).toBeNull()
  })
})
