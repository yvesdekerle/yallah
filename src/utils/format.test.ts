import { describe, it, expect } from 'vitest'
import { shortPrice, formatLocation } from './format.ts'

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
