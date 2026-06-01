import { describe, it, expect } from 'vitest'
import { shortPrice, formatLocation, shortDuration } from './format.ts'

describe('shortPrice', () => {
  it('extracts the first € amount', () => {
    expect(shortPrice('~25–35 €/pers en excursion organisée')).toBe('25–35 €')
  })

  it('handles a single number price', () => {
    expect(shortPrice('400–700 € le bateau pour la journée')).toBe('400–700 €')
  })

  it('prefers the € inside parens over the leading Rs amount', () => {
    expect(
      shortPrice('~6 500 Rs / pers (~135 €/pers) tout inclus'),
    ).toBe('135 €')
  })

  it('falls back to the first chunk when no € is present', () => {
    expect(shortPrice('Gratuit')).toBe('Gratuit')
    expect(shortPrice('Variable selon le lieu choisi')).toBe(
      'Variable selon le lieu choisi',
    )
  })

  it('strips the leading ~', () => {
    expect(shortPrice('~50 €')).toBe('50 €')
  })
})

describe('shortDuration', () => {
  it('strips a single parenthesized clarification', () => {
    expect(shortDuration('~2h (briefing + plongée)')).toBe('~2h')
  })

  it('strips multiple parenthesized groups, preserving glue words', () => {
    expect(
      shortDuration('~4h (rando classique) ou ~5h (canyoning)'),
    ).toBe('~4h ou ~5h')
  })

  it('leaves durations without parens unchanged', () => {
    expect(shortDuration('~3–4h')).toBe('~3–4h')
    expect(shortDuration('Journée complète')).toBe('Journée complète')
  })

  it('returns the prefix only when the whole detail is parenthesized', () => {
    expect(shortDuration('Demi-journée (~3–4h)')).toBe('Demi-journée')
  })
})

describe('formatLocation', () => {
  it('turns trailing parens into a middot suffix', () => {
    expect(formatLocation('Blue Bay (sud-est)')).toBe('Blue Bay · sud-est')
  })

  it('leaves a location without parens unchanged', () => {
    expect(formatLocation('Tamarin')).toBe('Tamarin')
  })

  it('keeps non-trailing parens alone', () => {
    expect(formatLocation('Place (a) extra')).toBe('Place (a) extra')
  })
})
