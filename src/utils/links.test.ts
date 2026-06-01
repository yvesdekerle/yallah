import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('getLinks', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../data/links.json')
  })

  it('returns [] when no links exist for the activity', async () => {
    vi.doMock('../data/links.json', () => ({ default: {} }))
    const { getLinks } = await import('./links.ts')
    expect(getLinks('a001')).toEqual([])
  })

  it('returns the configured list for known activities', async () => {
    vi.doMock('../data/links.json', () => ({
      default: {
        a042: [
          { url: 'https://example.com', label: 'Site officiel' },
          { url: 'https://example.com/booking' },
        ],
      },
    }))
    const { getLinks } = await import('./links.ts')
    const out = getLinks('a042')
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      url: 'https://example.com',
      label: 'Site officiel',
    })
    expect(out[1]).toEqual({ url: 'https://example.com/booking' })
  })
})
