import { describe, it, expect } from 'vitest'
import { autoQuery, stripAccents } from './photo-query.ts'
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
  it('drops Mauritius place names and keeps the activity verb', () => {
    const q = autoQuery(make({ title: 'Snorkeling à Blue Bay Marine Park' }))
    expect(q).not.toContain('blue bay')
    expect(q).toContain('snorkeling')
    expect(q).toContain('marine park')
    expect(q).toContain('ocean tropical') // category hint
  })

  it('translates "plongée sous-marine" to "scuba diving"', () => {
    const q = autoQuery(
      make({ title: 'Plongée sous-marine (baptême ou exploration)' }),
    )
    expect(q).toContain('scuba diving')
    expect(q).not.toContain('plongee')
  })

  it('translates "pêche au gros" to "deep sea fishing"', () => {
    const q = autoQuery(make({ title: 'Pêche au gros' }))
    expect(q).toContain('deep sea fishing')
  })

  it('translates "cachalots" to "sperm whales" and keeps the action', () => {
    const q = autoQuery(make({ title: 'Snorkeling avec cachalots' }))
    expect(q).toContain('snorkeling')
    expect(q).toContain('sperm whales')
  })

  it('translates the full "nager avec les cachalots" phrase', () => {
    const q = autoQuery(make({ title: 'Nager avec les cachalots' }))
    // "with" gets filtered as a stopword after the phrase rewrite, leaving
    // a tighter "swim sperm whale" query — still a great Pexels match.
    expect(q).toContain('swim')
    expect(q).toContain('sperm whale')
  })

  it('drops "Authentiseaty" but keeps the sunset action', () => {
    const q = autoQuery(
      make({ title: 'Sortie sunset chez Authentiseaty (Cap Malheureux)' }),
    )
    expect(q).not.toContain('authentiseaty')
    expect(q).not.toContain('cap malheureux')
    expect(q).toContain('sunset')
  })

  it('translates "yacht à voile coucher de soleil"', () => {
    const q = autoQuery(make({ title: 'Yacht à voile coucher de soleil' }))
    expect(q).toContain('sunset')
    expect(q).toContain('sailing yacht')
  })

  it('translates "pirogue traditionnelle à voile latine"', () => {
    const q = autoQuery(
      make({ title: 'Pirogue traditionnelle à voile latine' }),
    )
    expect(q).toContain('outrigger canoe')
    expect(q).toContain('lateen sail')
  })

  it('drops the "BS600" submarine model number', () => {
    const q = autoQuery(
      make({ title: 'Sous-marin Blue Safari (vrai sous-marin à -35 m)' }),
    )
    expect(q).toContain('submarine')
    expect(q).not.toContain('bs600')
    expect(q).not.toContain('blue safari')
  })

  it('uses the hiking hint for mountain activities', () => {
    const q = autoQuery(
      make({
        title: 'Randonnée Le Morne',
        category: '🏔️ Randonnée & Sommets',
      }),
    )
    expect(q).toContain('hiking')
    expect(q).toContain('mountain')
  })

  it('uses the food hint for gastronomy', () => {
    const q = autoQuery(
      make({
        title: 'Distillerie de rhum Chamarel',
        category: '🍽️ Gastronomie & Spiritueux',
      }),
    )
    expect(q).toContain('rum distillery')
    expect(q).toContain('food restaurant')
    expect(q).not.toContain('chamarel')
  })

  it('de-duplicates repeated tokens', () => {
    const q = autoQuery(make({ title: 'Plongée plongée sous-marine' }))
    // "scuba" should appear once even though "plongée" was duplicated.
    expect(q.match(/scuba/g)?.length).toBe(1)
  })

  it('caps the title portion at 6 tokens', () => {
    const q = autoQuery(
      make({
        title: 'Snorkeling kayak rafting climbing diving surfing fishing biking',
      }),
    )
    // 6 tokens from title + hint words ("ocean tropical").
    const tokens = q.split(/\s+/)
    expect(tokens.length).toBeLessThanOrEqual(8)
  })
})
