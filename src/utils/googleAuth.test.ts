import { describe, it, expect } from 'vitest'
import { toGoogleUser } from './googleAuth.ts'

describe('toGoogleUser', () => {
  it('maps a full payload, preferring the first name', () => {
    expect(
      toGoogleUser({
        sub: '123',
        given_name: 'Yves',
        name: 'Yves Dekerle',
        email: 'yves@example.com',
        picture: 'https://lh3.googleusercontent.com/a/abc',
      }),
    ).toEqual({
      sub: '123',
      name: 'Yves',
      email: 'yves@example.com',
      picture: 'https://lh3.googleusercontent.com/a/abc',
    })
  })

  it('falls back to the full name when given_name is missing', () => {
    expect(
      toGoogleUser({ sub: '1', name: 'Solène B', email: 'a@b.co' }),
    ).toMatchObject({ name: 'Solène B' })
  })

  it('falls back to the email when no name at all', () => {
    expect(
      toGoogleUser({ sub: '1', email: 'a@b.co' }),
    ).toMatchObject({ name: 'a@b.co' })
  })

  it('omits picture when absent', () => {
    const u = toGoogleUser({ sub: '1', given_name: 'A', email: 'a@b.co' })
    expect(u).not.toHaveProperty('picture')
  })

  it('returns null without a stable sub', () => {
    expect(toGoogleUser({ given_name: 'A', email: 'a@b.co' })).toBeNull()
  })

  it('returns null without an email', () => {
    expect(toGoogleUser({ sub: '1', given_name: 'A' })).toBeNull()
  })
})
