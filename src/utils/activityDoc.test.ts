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
    expect('groupMode' in doc).toBe(false)
    expect('groupSize' in doc).toBe(false)
    expect('createdBy' in doc).toBe(false)
    expect('photoUrls' in doc).toBe(false)
  })

  it('mirrors every optional field when present', () => {
    const doc = userActivityToDoc({
      ...base,
      duration: '2 h',
      difficulty: { dot: '🟢', label: 'Facile' },
      journee: true,
      insolite: 'Un détail',
      coords: { lat: -20.4, lng: 57.3 },
      groupMode: 'limited',
      groupSize: 6,
      createdBy: { uid: 'yves', name: 'Yves' },
      photoRefs: [{ kind: 'url', url: 'https://x/1.jpg' }],
    })
    expect(doc.duration).toBe('2 h')
    expect(doc.difficulty).toEqual({ dot: '🟢', label: 'Facile' })
    expect(doc.journee).toBe(true)
    expect(doc.insolite).toBe('Un détail')
    expect(doc.coords).toEqual({ lat: -20.4, lng: 57.3 })
    expect(doc.groupMode).toBe('limited')
    expect(doc.groupSize).toBe(6)
  })

  it('mirrors groupMode without a size for non-limited formats', () => {
    const doc = userActivityToDoc({ ...base, groupMode: 'all' })
    expect(doc.groupMode).toBe('all')
    expect('groupSize' in doc).toBe(false)
  })
})
