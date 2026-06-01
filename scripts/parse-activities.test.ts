import { describe, it, expect } from 'vitest'
import {
  parseActivities,
  parseHeading,
  parseDifficulty,
  parseRating,
  parseTags,
  stripMarkdownMarkers,
} from './parse-activities.ts'

describe('parseHeading', () => {
  it('extracts a plain heading', () => {
    expect(parseHeading('#### n°1 — Snorkeling à Blue Bay Marine Park')).toEqual({
      number: 1,
      title: 'Snorkeling à Blue Bay Marine Park',
    })
  })

  it('strips the diamond between number and em-dash', () => {
    expect(
      parseHeading("#### n°6 💎 — Plongée à l'Île Ronde"),
    ).toEqual({ number: 6, title: "Plongée à l'Île Ronde" })
  })

  it('strips the trailing "ancien n°X"', () => {
    expect(
      parseHeading('#### n°3 — Sous-marin Blue Safari *(ancien n°6)*'),
    ).toEqual({ number: 3, title: 'Sous-marin Blue Safari' })
  })

  it('handles multiple symbols and the secret key emoji', () => {
    expect(
      parseHeading('#### n°8 💎 🗝️ — Snorkeling avec cachalots'),
    ).toEqual({ number: 8, title: 'Snorkeling avec cachalots' })
  })

  it('returns null for unrelated lines', () => {
    expect(parseHeading('### 🌊 Mer & Sports nautiques')).toBeNull()
    expect(parseHeading('**Tags** : 🌊 🐅')).toBeNull()
  })
})

describe('parseDifficulty', () => {
  it('parses the green level', () => {
    expect(parseDifficulty('🟢 Facile (savoir nager)')).toEqual({
      dot: '#22C268',
      label: 'Facile',
      detail: 'savoir nager',
    })
  })

  it('parses the yellow level without details', () => {
    expect(parseDifficulty('🟡 Modérée')).toEqual({
      dot: '#FFB627',
      label: 'Modérée',
    })
  })

  it('parses the red level with parenthesized details', () => {
    expect(parseDifficulty('🔴 Très difficile (open water + requis)')).toEqual({
      dot: '#FF4757',
      label: 'Très difficile',
      detail: 'open water + requis',
    })
  })

  it('returns undefined when the emoji is unknown', () => {
    expect(parseDifficulty('🟣 Facile')).toBeUndefined()
  })
})

describe('parseRating', () => {
  it('extracts the integer rating', () => {
    expect(parseRating('⭐⭐⭐⭐⭐ 5/5')).toBe(5)
    expect(parseRating('⭐⭐⭐☆☆ 3/5')).toBe(3)
    expect(parseRating('⭐⭐⭐⭐☆ 4/5')).toBe(4)
  })

  it('returns 0 when no rating found', () => {
    expect(parseRating('')).toBe(0)
    expect(parseRating('no number here')).toBe(0)
  })
})

describe('stripMarkdownMarkers', () => {
  it('removes ** bold markers', () => {
    expect(stripMarkdownMarkers('foo **bar** baz')).toBe('foo bar baz')
  })

  it('removes stray single * markers', () => {
    expect(stripMarkdownMarkers('film *Santosha* culte')).toBe(
      'film Santosha culte',
    )
  })

  it('collapses double spaces created by removal', () => {
    expect(stripMarkdownMarkers('foo  **  bar')).toBe('foo bar')
  })

  it('keeps text without any markers intact', () => {
    expect(stripMarkdownMarkers('plain text')).toBe('plain text')
  })
})

describe('parseTags', () => {
  it('splits emoji tags by whitespace', () => {
    expect(parseTags('🌊 🐅 💎')).toEqual(['🌊', '🐅', '💎'])
  })

  it('returns an empty list when nothing is provided', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags('   ')).toEqual([])
  })
})

describe('parseActivities (integration)', () => {
  const sample = `
## Activités par catégorie

### 🌊 Mer & Sports nautiques

*38 activités*


#### n°1 — Snorkeling à Blue Bay Marine Park

**Tags** : 🌊 🐅
**Lieu** : Blue Bay (sud-est)
**Trajet depuis Tamarin** : ~1h–1h15
**Description** : Parc marin protégé, visibilité 20–30 m.
**Durée** : ~3–4h
**Difficulté** : 🟢 Facile (savoir nager)
**Prix** : ~25–35 €/pers
**Note** : ⭐⭐⭐⭐⭐ 5/5


#### n°2 💎 — Pépite avec un secret *(ancien n°99)*

**Tags** : 🌊 💎 🗝️
**Lieu** : Quelque part
**Trajet depuis Tamarin** : ~30 min
**Description** : Test.
**Prix** : 50 €
**Note** : ⭐⭐⭐⭐☆ 4/5
**Insolite** : Très peu connu.


### 🍽️ Gastronomie & Spiritueux

#### n°3 — Resto sans difficulté ni durée

**Tags** : 🍽️
**Lieu** : Port Louis
**Trajet depuis Tamarin** : ~1h
**Description** : Test 2.
**Prix** : 30 €
**Note** : ⭐⭐⭐☆☆ 3/5


## Récap

(stop here)
`

  it('parses all activities and stops at the Récap section', () => {
    const result = parseActivities(sample)
    expect(result).toHaveLength(3)
  })

  it('attaches the category and id', () => {
    const result = parseActivities(sample)
    expect(result[0]!.id).toBe('a001')
    expect(result[0]!.number).toBe(1)
    expect(result[0]!.category).toBe('🌊 Mer & Sports nautiques')
    expect(result[2]!.category).toBe('🍽️ Gastronomie & Spiritueux')
  })

  it('flags pepite and secret based on tags', () => {
    const result = parseActivities(sample)
    expect(result[1]!.pepite).toBe(true)
    expect(result[1]!.secret).toBe(true)
    expect(result[0]!.pepite).toBe(false)
    expect(result[0]!.secret).toBe(false)
  })

  it('flags journee from "Journée complète" duration or ☀️ tag', () => {
    const fullDay = `
## Activités par catégorie

### Cat

#### n°1 — Sortie journée
**Tags** : 🌊
**Lieu** : X
**Trajet depuis Tamarin** : ~1h
**Description** : test.
**Durée** : Journée complète
**Prix** : 50 €
**Note** : ⭐⭐⭐⭐⭐ 5/5


#### n°2 — Sortie demi-journée
**Tags** : 🌊
**Lieu** : X
**Trajet depuis Tamarin** : ~1h
**Description** : test.
**Durée** : Demi-journée
**Prix** : 50 €
**Note** : ⭐⭐⭐⭐⭐ 5/5


#### n°3 — Sortie tag-soleil
**Tags** : 🌊 ☀️
**Lieu** : X
**Trajet depuis Tamarin** : ~1h
**Description** : test.
**Prix** : 50 €
**Note** : ⭐⭐⭐⭐⭐ 5/5


## Récap
`
    const result = parseActivities(fullDay)
    expect(result[0]!.journee).toBe(true)
    expect(result[1]!.journee).toBe(false)
    expect(result[2]!.journee).toBe(true)
  })

  it('captures optional insolite', () => {
    const result = parseActivities(sample)
    expect(result[1]!.insolite).toBe('Très peu connu.')
    expect(result[0]!.insolite).toBeUndefined()
  })

  it('allows missing duration and difficulty', () => {
    const result = parseActivities(sample)
    expect(result[2]!.duration).toBeUndefined()
    expect(result[2]!.difficulty).toBeUndefined()
  })

  it('produces a sorted, contiguous id sequence', () => {
    const result = parseActivities(sample)
    expect(result.map((a) => a.number)).toEqual([1, 2, 3])
    expect(result.map((a) => a.id)).toEqual(['a001', 'a002', 'a003'])
  })
})
