import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard: the Vercel CSP/COOP headers must keep Google SSO working.
// (Tightening these back to 'self' silently breaks the "Se connecter avec
// Google" button — the gsi/client script gets CSP-blocked and the OAuth popup
// can't post its token back under COOP same-origin.)
const vercel = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

// Look the rule up by its catch-all source rather than by index — other,
// path-specific header rules (e.g. no-store on /version.json) may precede it.
const catchAll = vercel.headers.find((h) => h.source === '/(.*)')
if (!catchAll) throw new Error('vercel.json: missing catch-all header rule')
const headers = Object.fromEntries(
  catchAll.headers.map((h) => [h.key, h.value]),
)
const csp = headers['Content-Security-Policy']

describe('vercel.json security headers — Google SSO', () => {
  it('allows loading the Google Identity Services script', () => {
    expect(csp).toContain('https://accounts.google.com/gsi/client')
  })

  it('allows loading the gapi script that Firebase Auth signInWithPopup needs', () => {
    // Firebase Auth's popup flow loads https://apis.google.com/js/api.js to
    // build its auth iframe — without this in script-src the popup is CSP-blocked.
    const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? ''
    expect(scriptSrc).toContain('https://apis.google.com')
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

// /admin/activities loads the Firebase SDK from the gstatic CDN and talks to
// Firestore directly (no sign-in) — its scoped CSP must keep allowing both,
// or the page silently loses its cloud persistence.
const adminRule = vercel.headers.find((h) => h.source === '/admin/(.*)')
if (!adminRule) throw new Error('vercel.json: missing /admin/(.*) header rule')
const adminCsp =
  adminRule.headers.find((h) => h.key === 'Content-Security-Policy')?.value ??
  ''

describe('vercel.json security headers — /admin Firebase', () => {
  it('allows the Firebase SDK ESM modules from the gstatic CDN', () => {
    const scriptSrc = /script-src ([^;]*)/.exec(adminCsp)?.[1] ?? ''
    expect(scriptSrc).toContain('https://www.gstatic.com')
  })

  it('allows connecting to Firestore', () => {
    const connectSrc = /connect-src ([^;]*)/.exec(adminCsp)?.[1] ?? ''
    expect(connectSrc).toContain('https://firestore.googleapis.com')
  })
})
