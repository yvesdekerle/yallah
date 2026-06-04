import { describe, it, expect, vi, afterEach } from 'vitest'
import { cityFromReverse, reverseGeocodeCity } from './geocode.ts'

describe('cityFromReverse', () => {
  it('prefers the most specific available place name', () => {
    expect(cityFromReverse({ address: { city: 'Port Louis', state: 'X' } })).toBe(
      'Port Louis',
    )
    expect(cityFromReverse({ address: { town: 'Tamarin' } })).toBe('Tamarin')
    expect(cityFromReverse({ address: { village: 'Chamarel' } })).toBe(
      'Chamarel',
    )
  })
  it('falls back through municipality/suburb/county/state', () => {
    expect(cityFromReverse({ address: { county: 'Rivière Noire' } })).toBe(
      'Rivière Noire',
    )
  })
  it('trims whitespace', () => {
    expect(cityFromReverse({ address: { town: '  Flic en Flac  ' } })).toBe(
      'Flic en Flac',
    )
  })
  it('returns null on missing/empty/garbage payloads', () => {
    expect(cityFromReverse(null)).toBeNull()
    expect(cityFromReverse({})).toBeNull()
    expect(cityFromReverse({ address: {} })).toBeNull()
    expect(cityFromReverse({ address: { city: '   ' } })).toBeNull()
    expect(cityFromReverse('nope')).toBeNull()
  })
})

describe('reverseGeocodeCity', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('returns the parsed city on a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: { village: 'Le Morne' } }),
      }),
    )
    await expect(reverseGeocodeCity(-20.45, 57.32)).resolves.toBe('Le Morne')
  })
  it('resolves to null on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(reverseGeocodeCity(-20.45, 57.32)).resolves.toBeNull()
  })
  it('resolves to null when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(reverseGeocodeCity(-20.45, 57.32)).resolves.toBeNull()
  })
  it('resolves to null (no fetch) for non-finite coords', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(reverseGeocodeCity(NaN, 57.32)).resolves.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
