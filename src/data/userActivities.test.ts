import { describe, it, expect, beforeEach } from 'vitest'
import type { StoredUserActivity } from '../types/userActivity.ts'
import {
  USER_ACTIVITIES_KEY,
  loadUserActivities,
  persistUserActivities,
  makeUserId,
} from './userActivities.ts'

function sample(id: string): StoredUserActivity {
  return {
    id,
    number: 900,
    title: 'Test',
    tags: [],
    category: 'Autre',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 0,
    pepite: false,
    secret: false,
    userAdded: true,
    photoRefs: [],
    createdAt: 123,
  }
}

describe('userActivities store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns [] when nothing is stored', () => {
    expect(loadUserActivities()).toEqual([])
  })

  it('round-trips the list through localStorage', () => {
    const list = [sample('u-1'), sample('u-2')]
    persistUserActivities(list)
    expect(loadUserActivities()).toEqual(list)
  })

  it('falls back to [] on corrupt JSON', () => {
    window.localStorage.setItem(USER_ACTIVITIES_KEY, '{not json')
    expect(loadUserActivities()).toEqual([])
  })

  it('falls back to [] when the stored value is not an array', () => {
    window.localStorage.setItem(USER_ACTIVITIES_KEY, JSON.stringify({ a: 1 }))
    expect(loadUserActivities()).toEqual([])
  })

  it('drops entries that fail the shape guard, keeping the valid ones', () => {
    const valid = sample('u-1')
    window.localStorage.setItem(
      USER_ACTIVITIES_KEY,
      JSON.stringify([
        valid,
        null,
        { id: 'no-flag', photoRefs: [], createdAt: 1 }, // missing userAdded
        { id: 42, userAdded: true, photoRefs: [], createdAt: 1 }, // id not a string
        'garbage',
      ]),
    )
    expect(loadUserActivities()).toEqual([valid])
  })

  it('makeUserId is prefixed and unique', () => {
    const a = makeUserId()
    const b = makeUserId()
    expect(a.startsWith('u-')).toBe(true)
    expect(a).not.toBe(b)
  })
})
