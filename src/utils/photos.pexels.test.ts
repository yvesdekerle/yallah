import { describe, it, expect, vi } from 'vitest'

// Inject a Pexels CDN URL so the withSize() param-rewriting path runs (the
// committed photos.json holds local paths, which pass through untouched).
vi.mock('../data/photos.json', () => ({
  default: { 'a-pexels': ['https://images.pexels.com/photos/1/x.jpg'] },
}))

import { heroPhotoUrl, detailPhotos } from './photos.ts'
import type { Activity } from '../types/activity.ts'

const make = (id: string): Activity => ({
  id,
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
})

describe('photos — Pexels CDN sizing', () => {
  it('heroPhotoUrl adds crop/compression params to a Pexels URL', () => {
    const url = heroPhotoUrl(make('a-pexels'))
    expect(url).toContain('images.pexels.com')
    expect(url).toContain('auto=compress')
    expect(url).toContain('w=900')
    expect(url).toContain('h=1100')
  })

  it('detailPhotos sizes each Pexels URL to 900x900', () => {
    const urls = detailPhotos(make('a-pexels'))
    expect(urls[0]).toContain('w=900')
    expect(urls[0]).toContain('h=900')
  })
})
