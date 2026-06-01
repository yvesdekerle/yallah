import { describe, it, expect } from 'vitest'
import {
  BASE_TAMARIN,
  BASE_TROU_AUX_BICHES,
  estimateDriveTime,
  haversineKm,
} from './distance.ts'

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(BASE_TAMARIN.coords, BASE_TAMARIN.coords)).toBe(0)
  })

  it('returns ~28 km between Tamarin and Trou aux Biches', () => {
    const d = haversineKm(BASE_TAMARIN.coords, BASE_TROU_AUX_BICHES.coords)
    expect(d).toBeGreaterThan(25)
    expect(d).toBeLessThan(40)
  })
})

describe('estimateDriveTime', () => {
  it('returns ~5 min for the base itself', () => {
    expect(estimateDriveTime(BASE_TAMARIN.coords, BASE_TAMARIN)).toBe('~5 min')
  })

  it('returns minute-bucketed values under an hour', () => {
    const cap = { lat: -20.151, lng: 57.46 }
    const t = estimateDriveTime(cap, BASE_TAMARIN)
    expect(t).toMatch(/^~\d+ min$/)
  })

  it('returns h-rounded values over an hour for distant points', () => {
    const farEast = { lat: -20.45, lng: 57.8 }
    const t = estimateDriveTime(farEast, BASE_TAMARIN)
    expect(t).toMatch(/^~\d+h(\d{2})?$/)
  })
})
