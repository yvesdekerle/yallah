import { describe, it, expect } from 'vitest'
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

describe('heroPhotoUrl', () => {
  it('returns the local placeholder when the activity has no photos', () => {
    // The default seed photos.json is empty, so a randomly-named id has no entry.
    expect(heroPhotoUrl(make('a999'))).toBe('/photos/hero.jpg')
  })
})

describe('detailPhotos', () => {
  it('always returns 12 entries', () => {
    expect(detailPhotos(make('a999'))).toHaveLength(12)
  })

  it('falls back to 12 placeholders when nothing is mapped', () => {
    const photos = detailPhotos(make('a999'))
    expect(photos.every((p) => p === '/photos/hero.jpg')).toBe(true)
  })
})
