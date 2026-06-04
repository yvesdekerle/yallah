import { describe, it, expect } from 'vitest'
import { groupModeOf, groupFormatLabel } from './groupFormat.ts'

describe('groupModeOf', () => {
  it('defaults to subgroup when unset', () => {
    expect(groupModeOf({})).toBe('subgroup')
  })
  it('returns the explicit mode', () => {
    expect(groupModeOf({ groupMode: 'all' })).toBe('all')
    expect(groupModeOf({ groupMode: 'limited' })).toBe('limited')
  })
})

describe('groupFormatLabel', () => {
  it('labels the default subgroup', () => {
    expect(groupFormatLabel({})).toBe('En sous-groupe')
    expect(groupFormatLabel({ groupMode: 'subgroup' })).toBe('En sous-groupe')
  })
  it('labels tous ensemble', () => {
    expect(groupFormatLabel({ groupMode: 'all' })).toBe('Tous ensemble')
  })
  it('labels a participant cap with pluralisation', () => {
    expect(groupFormatLabel({ groupMode: 'limited', groupSize: 6 })).toBe(
      'Max 6 personnes',
    )
    expect(groupFormatLabel({ groupMode: 'limited', groupSize: 1 })).toBe(
      'Max 1 personne',
    )
  })
  it('floors a fractional cap', () => {
    expect(groupFormatLabel({ groupMode: 'limited', groupSize: 4.7 })).toBe(
      'Max 4 personnes',
    )
  })
  it('falls back to a generic label when the cap is missing or invalid', () => {
    expect(groupFormatLabel({ groupMode: 'limited' })).toBe('Nombre limité')
    expect(groupFormatLabel({ groupMode: 'limited', groupSize: 0 })).toBe(
      'Nombre limité',
    )
    expect(groupFormatLabel({ groupMode: 'limited', groupSize: -3 })).toBe(
      'Nombre limité',
    )
  })
})
