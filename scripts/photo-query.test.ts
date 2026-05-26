import { describe, it, expect } from 'vitest'
import { autoQuery, fallbackQuery, stripAccents } from './photo-query.ts'
import type { Activity } from '../src/types/activity.ts'

function make(overrides: Partial<Activity>): Activity {
  return {
    id: 'a000',
    number: 0,
    title: '',
    tags: [],
    category: '🌊 Mer & Sports nautiques',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 5,
    pepite: false,
    secret: false,
    ...overrides,
  }
}

describe('stripAccents', () => {
  it('removes French accents', () => {
    expect(stripAccents('île à pêche')).toBe('ile a peche')
    expect(stripAccents('coucher de soleil')).toBe('coucher de soleil')
  })
})

describe('autoQuery', () => {
  it('always anchors the query with "mauritius"', () => {
    const q = autoQuery(make({ title: 'Plongée sous-marine' }))
    expect(q.endsWith('mauritius')).toBe(true)
  })

  it('keeps well-known Mauritius landmarks (Le Morne, Blue Bay, ...)', () => {
    expect(autoQuery(make({ title: 'Kitesurf au Morne' }))).toContain('morne')
    expect(autoQuery(make({ title: 'Snorkeling à Blue Bay' }))).toContain('blue bay')
    expect(autoQuery(make({ title: 'Visite Chamarel' }))).toContain('chamarel')
    expect(autoQuery(make({ title: 'Sortie Île aux Cerfs' }))).toContain('cerfs')
  })

  it('still strips private brand names', () => {
    const q = autoQuery(
      make({ title: 'Sortie sunset chez Authentiseaty' }),
    )
    expect(q).not.toContain('authentiseaty')
    expect(q).toContain('sunset')
    expect(q).toContain('mauritius')
  })

  it('translates "plongée sous-marine" to "scuba diving"', () => {
    const q = autoQuery(
      make({ title: 'Plongée sous-marine (baptême ou exploration)' }),
    )
    expect(q).toContain('scuba diving')
    expect(q).toContain('mauritius')
    expect(q).not.toContain('plongee')
  })

  it('translates "pêche au gros" to "deep sea fishing"', () => {
    const q = autoQuery(make({ title: 'Pêche au gros' }))
    expect(q).toContain('deep sea fishing')
    expect(q).toContain('mauritius')
  })

  it('translates "cachalots" to "sperm whales"', () => {
    const q = autoQuery(make({ title: 'Snorkeling avec cachalots' }))
    expect(q).toContain('snorkeling')
    expect(q).toContain('sperm whales')
    expect(q).toContain('mauritius')
  })

  it('drops the "BS600" submarine model number', () => {
    const q = autoQuery(
      make({ title: 'Sous-marin Blue Safari (vrai sous-marin à -35 m)' }),
    )
    expect(q).toContain('submarine')
    expect(q).not.toContain('bs600')
    expect(q).not.toContain('blue safari')
    expect(q).toContain('mauritius')
  })

  it('de-duplicates repeated tokens', () => {
    const q = autoQuery(make({ title: 'Plongée plongée sous-marine' }))
    expect(q.match(/scuba/g)?.length).toBe(1)
  })
})

describe('fallbackQuery', () => {
  it('combines category hint with "mauritius"', () => {
    expect(fallbackQuery(make({ category: '🌊 Mer & Sports nautiques' }))).toBe(
      'ocean beach mauritius',
    )
    expect(
      fallbackQuery(make({ category: '🏔️ Randonnée & Sommets' })),
    ).toBe('mountain hiking mauritius')
  })

  it('falls back to "tropical mauritius" for unknown categories', () => {
    expect(fallbackQuery(make({ category: 'unknown' }))).toBe(
      'tropical mauritius',
    )
  })
})
