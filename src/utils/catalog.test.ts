import { describe, it, expect, beforeEach } from 'vitest'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'
import { STORAGE_KEYS } from '../constants/swipe.ts'
import {
  applyCatalog,
  catalogSignature,
  loadCachedCatalog,
  migrateVoteEntries,
  parseCatalog,
  remapVoteId,
  remapVoteValues,
  saveCachedCatalog,
  type PublishedCatalog,
} from './catalog.ts'

const act = (id: string, title = id): Activity =>
  ({
    id,
    number: 1,
    title,
    tags: [],
    category: 'cat',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 4,
    pepite: false,
    secret: false,
  }) as Activity

const CATALOG: PublishedCatalog = {
  sourceVersion: 3,
  publishedAtMs: 1000,
  // a002 merged into a001, a003 écartée
  removed: { a002: 'a001', a003: null },
  added: [act('u1', 'Ajoutée au tri')],
}

describe('parseCatalog', () => {
  it('accepts a valid payload and normalises added activities', () => {
    const parsed = parseCatalog({
      sourceVersion: 2,
      publishedAtMs: 42,
      removed: { a002: 'a001', a003: null, bad: 12 },
      added: [{ id: 'u1', title: 'X' }, { nope: true }, null],
    })
    expect(parsed).not.toBeNull()
    expect(parsed?.removed).toEqual({ a002: 'a001', a003: null })
    expect(parsed?.added).toHaveLength(1)
    expect(parsed?.added[0]?.tags).toEqual([])
  })

  it('rejects malformed payloads', () => {
    expect(parseCatalog(null)).toBeNull()
    expect(parseCatalog('x')).toBeNull()
    expect(parseCatalog({ removed: null, added: [] })).toBeNull()
    expect(parseCatalog({ removed: {}, added: 'nope' })).toBeNull()
  })
})

describe('applyCatalog', () => {
  const deck = [act('a001'), act('a002'), act('a003')]

  it('is identity without a catalog', () => {
    expect(applyCatalog(deck, null)).toBe(deck)
  })

  it('filters retired activities and appends the added ones', () => {
    expect(applyCatalog(deck, CATALOG).map((a) => a.id)).toEqual([
      'a001',
      'u1',
    ])
  })

  it('never duplicates an added activity already in the deck', () => {
    const withDupe = [...deck, act('u1')]
    const ids = applyCatalog(withDupe, CATALOG).map((a) => a.id)
    expect(ids.filter((i) => i === 'u1')).toHaveLength(1)
  })
})

describe('remapVoteId', () => {
  it('keeps surviving ids, retargets merged ones, drops écartées', () => {
    expect(remapVoteId('a001', CATALOG)).toBe('a001')
    expect(remapVoteId('a002', CATALOG)).toBe('a001')
    expect(remapVoteId('a003', CATALOG)).toBeNull()
  })

  it('follows merge chains and survives cycles', () => {
    const chained: PublishedCatalog = {
      ...CATALOG,
      removed: { a: 'b', b: 'c' },
    }
    expect(remapVoteId('a', chained)).toBe('c')
    const cyclic: PublishedCatalog = { ...CATALOG, removed: { a: 'b', b: 'a' } }
    expect(remapVoteId('a', cyclic)).toBeNull()
  })
})

describe('migrateVoteEntries', () => {
  it('remaps merged votes, drops écartées, first vote wins on collision', () => {
    const history: VoteEntry[] = [
      { id: 'a002', verdict: 'top' }, // merged → becomes a001
      { id: 'a001', verdict: 'non' }, // collides with the remapped one → dropped
      { id: 'a003', verdict: 'oui' }, // écartée → dropped
      { id: 'a042', verdict: 'whynot' }, // untouched
    ]
    expect(migrateVoteEntries(history, CATALOG)).toEqual([
      { id: 'a001', verdict: 'top' },
      { id: 'a042', verdict: 'whynot' },
    ])
  })

  it('is identity without a catalog', () => {
    const history: VoteEntry[] = [{ id: 'a002', verdict: 'oui' }]
    expect(migrateVoteEntries(history, null)).toBe(history)
  })
})

describe('remapVoteValues', () => {
  it('remaps the keys of a votes map', () => {
    expect(
      remapVoteValues({ a002: 'v1', a003: 'v2', a042: 'v3' }, CATALOG),
    ).toEqual({ a001: 'v1', a042: 'v3' })
  })
})

describe('cache round-trip', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEYS.catalog))

  it('saves, signs and reloads a catalog', () => {
    expect(loadCachedCatalog()).toBeNull()
    expect(catalogSignature(null)).toBe('none')
    expect(saveCachedCatalog(CATALOG)).toBe(true)
    const back = loadCachedCatalog()
    expect(back).toEqual(CATALOG)
    expect(catalogSignature(back)).toBe('3:1000')
    expect(saveCachedCatalog(null)).toBe(true)
    expect(loadCachedCatalog()).toBeNull()
  })
})
