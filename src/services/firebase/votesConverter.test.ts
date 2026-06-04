import { describe, it, expect } from 'vitest'
import {
  coerceVoteValue,
  parseVotesDoc,
  sanitizeVoteValues,
} from './votesConverter.ts'

describe('coerceVoteValue', () => {
  it('keeps a valid verdict', () => {
    expect(coerceVoteValue({ verdict: 'oui' })).toEqual({ verdict: 'oui' })
  })

  it('preserves quotaHit only when strictly true', () => {
    expect(coerceVoteValue({ verdict: 'top', quotaHit: true })).toEqual({
      verdict: 'top',
      quotaHit: true,
    })
    expect(coerceVoteValue({ verdict: 'top', quotaHit: false })).toEqual({
      verdict: 'top',
    })
  })

  it('drops an unknown verdict string', () => {
    expect(coerceVoteValue({ verdict: 'banane' })).toBeNull()
    expect(coerceVoteValue({ verdict: 'Oui' })).toBeNull() // wrong case
    expect(coerceVoteValue({ verdict: 'skip' })).toBeNull() // never persisted
  })

  it('drops non-object / malformed entries', () => {
    expect(coerceVoteValue(null)).toBeNull()
    expect(coerceVoteValue('oui')).toBeNull()
    expect(coerceVoteValue({})).toBeNull()
    expect(coerceVoteValue({ verdict: 42 })).toBeNull()
  })
})

describe('parseVotesDoc', () => {
  it('parses a full doc and converts a Timestamp updatedAt to millis', () => {
    expect(
      parseVotesDoc('u1', {
        uid: 'u1',
        name: 'Yves',
        activities: { a001: { verdict: 'oui' }, a002: { verdict: 'top' } },
        updatedAt: { toMillis: () => 1700000000000 },
      }),
    ).toEqual({
      uid: 'u1',
      name: 'Yves',
      activities: { a001: { verdict: 'oui' }, a002: { verdict: 'top' } },
      updatedAt: 1700000000000,
    })
  })

  it('drops corrupt verdicts but keeps the valid ones', () => {
    expect(
      parseVotesDoc('u1', {
        uid: 'u1',
        name: 'Yves',
        activities: {
          a001: { verdict: 'oui' },
          a002: { verdict: 'bogus' },
          a003: 'not-an-object',
        },
      }).activities,
    ).toEqual({ a001: { verdict: 'oui' } })
  })

  it('falls back to safe defaults for a missing / malformed doc', () => {
    expect(parseVotesDoc('u9', undefined)).toEqual({
      uid: 'u9',
      name: '',
      activities: {},
      updatedAt: null,
    })
    expect(parseVotesDoc('u9', { name: 42, activities: null })).toEqual({
      uid: 'u9',
      name: '',
      activities: {},
      updatedAt: null,
    })
  })
})

describe('sanitizeVoteValues', () => {
  it('strips unknown verdicts before a write', () => {
    expect(
      sanitizeVoteValues({
        a001: { verdict: 'oui' },
        a002: { verdict: 'top', quotaHit: true },
        // @ts-expect-error — exercising the runtime guard against bad data
        a003: { verdict: 'nope' },
      }),
    ).toEqual({
      a001: { verdict: 'oui' },
      a002: { verdict: 'top', quotaHit: true },
    })
  })
})
