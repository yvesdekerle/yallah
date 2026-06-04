import { describe, it, expect } from 'vitest'
import { userActivityToDoc } from './activityDoc.ts'
import type { StoredUserActivity } from '../types/userActivity.ts'

const base: StoredUserActivity = {
  id: 'u-1',
  number: 900,
  title: 'Pique-nique',
  tags: ['🌊'],
  category: 'Plage',
  location: 'Le Morne',
  transit: '20 min',
  description: 'Spot secret',
  price: 'Gratuit',
  rating: 5,
  pepite: false,
  secret: false,
  userAdded: true,
  photoRefs: [],
  createdAt: 1,
}

describe('userActivityToDoc', () => {
  it('keeps createdBy and mirrors only URL photos (drops upload blobs)', () => {
    const doc = userActivityToDoc({
      ...base,
      createdBy: { uid: 'yves', name: 'Yves' },
      photoRefs: [
        { kind: 'url', url: 'https://x/1.jpg' },
        { kind: 'upload', id: 'p-9' },
      ],
    })
    expect(doc.createdBy).toEqual({ uid: 'yves', name: 'Yves' })
    expect(doc.photoUrls).toEqual(['https://x/1.jpg'])
    expect('updatedAt' in doc).toBe(false)
  })

  it('omits absent optional fields (no undefined for Firestore)', () => {
    const doc = userActivityToDoc(base)
    expect('duration' in doc).toBe(false)
    expect('difficulty' in doc).toBe(false)
    expect('coords' in doc).toBe(false)
    expect('createdBy' in doc).toBe(false)
    expect('photoUrls' in doc).toBe(false)
  })
})
