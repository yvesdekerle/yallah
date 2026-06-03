import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard: the Vercel CSP/COOP headers must keep Google SSO working.
// (Tightening these back to 'self' silently breaks the "Se connecter avec
// Google" button — the gsi/client script gets CSP-blocked and the OAuth popup
// can't post its token back under COOP same-origin.)
const vercel = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as { headers: { headers: { key: string; value: string }[] }[] }

const headers = Object.fromEntries(
  vercel.headers[0].headers.map((h) => [h.key, h.value]),
)
const csp = headers['Content-Security-Policy']

describe('vercel.json security headers — Google SSO', () => {
  it('allows loading the Google Identity Services script', () => {
    expect(csp).toContain('https://accounts.google.com/gsi/client')
  })

  it('allows connecting to Google for the token + userinfo fetch', () => {
    expect(csp).toContain('https://accounts.google.com')
    expect(csp).toContain('https://www.googleapis.com')
  })

  it('allows Google frames used by GIS', () => {
    expect(csp).toMatch(/frame-src[^;]*https:\/\/accounts\.google\.com/)
  })

  it('keeps script-src locked to self + Google only (no unsafe-inline)', () => {
    const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? ''
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('uses COOP same-origin-allow-popups so the OAuth popup can post back', () => {
    expect(headers['Cross-Origin-Opener-Policy']).toBe(
      'same-origin-allow-popups',
    )
  })
})
