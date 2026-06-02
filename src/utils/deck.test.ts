import { describe, it, expect } from 'vitest'
import { filteredDeck } from './deck.ts'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

function act(id: string, tags: string[]): Activity {
  return {
    id,
    number: Number(id.replace(/\D/g, '')),
    title: id,
    tags,
    category: 'Autre',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 0,
    pepite: false,
    secret: false,
  }
}

const ACTS = [
  act('a1', ['🌊']),
  act('a2', ['🏛️']),
  act('a3', ['🌊', '🌳']),
  act('a4', ['🍽️']),
  act('a5', ['🌳']),
]

describe('filteredDeck', () => {
  it('returns the full list untouched when no tag is selected', () => {
    const r = filteredDeck(ACTS, [], [])
    expect(r.deckActivities).toBe(ACTS)
    expect(r.filteredEmpty).toBe(false)
  })

  it('keeps only unvoted activities matching at least one tag (OR)', () => {
    const r = filteredDeck(ACTS, [], ['🌊'])
    expect(r.deckActivities.map((a) => a.id)).toEqual(['a1', 'a3'])
    expect(r.filteredEmpty).toBe(false)
  })

  it('matches the union across several selected tags', () => {
    const r = filteredDeck(ACTS, [], ['🏛️', '🍽️'])
    expect(r.deckActivities.map((a) => a.id)).toEqual(['a2', 'a4'])
  })

  it('puts voted activities first so activities[history.length] is the next match', () => {
    const history: VoteEntry[] = [
      { id: 'a1', verdict: 'oui' },
      { id: 'a2', verdict: 'non' },
    ]
    const r = filteredDeck(ACTS, history, ['🌊', '🌳'])
    // voted prefix (a1, a2) — count === history.length — then the unvoted matches
    expect(r.deckActivities.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a5'])
    expect(r.deckActivities[history.length]?.id).toBe('a3')
  })

  it('flags filteredEmpty when every match is already voted', () => {
    const history: VoteEntry[] = [
      { id: 'a1', verdict: 'oui' },
      { id: 'a3', verdict: 'top' },
    ]
    const r = filteredDeck(ACTS, history, ['🌊'])
    expect(r.filteredEmpty).toBe(true)
    // only the voted prefix remains; no card to serve
    expect(r.deckActivities.map((a) => a.id)).toEqual(['a1', 'a3'])
  })
})
