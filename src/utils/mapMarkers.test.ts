import { describe, it, expect } from 'vitest'
import { photoPinIcon } from './mapMarkers.ts'

// Parse the marker HTML the way Leaflet does (`div.innerHTML = options.html`)
// and return the tag names that actually got created. If a malicious photo URL
// breaks out, an injected <img>/<svg>/<script> shows up here.
function tagsIn(html: string): string[] {
  const div = document.createElement('div')
  div.innerHTML = html
  return Array.from(div.querySelectorAll('*')).map((el) => el.tagName.toLowerCase())
}

describe('photoPinIcon — injection safety', () => {
  it('a malicious photo URL cannot inject elements into the rendered marker', () => {
    const payload = "https://evil/x.jpg');}</style><img src=x onerror=alert(1)>"
    const tags = tagsIn(String(photoPinIcon({ photo: payload, ring: '#fff' }).options.html))
    expect(tags).not.toContain('img')
    expect(tags).not.toContain('script')
    expect(tags).not.toContain('style')
    // Only the marker's own structure survives (wrapper div + inner div).
    expect(tags.every((t) => t === 'div' || t === 'span')).toBe(true)
  })

  it('a value loaded from localStorage (never paste-validated) still renders safely', () => {
    // photoPinIcon is the sink: a URL persisted in user activities bypasses
    // paste-time validation, so the escape here is the actual security boundary.
    const stored = "x'><svg onload=alert(1)>"
    const tags = tagsIn(String(photoPinIcon({ photo: stored, ring: '#fff' }).options.html))
    expect(tags).not.toContain('svg')
    expect(tags.every((t) => t === 'div' || t === 'span')).toBe(true)
  })

  it('leaves a normal, already percent-encoded URL intact (no double-encoding)', () => {
    // Assert on the raw options.html string, NOT a mounted element's computed
    // style — jsdom's CSS parser drops a background-image with \HEX escapes.
    const url = 'https://images.pexels.com/photos/1/a%20b.jpg?auto=compress&w=400'
    const html = String(photoPinIcon({ photo: url, ring: '#fff' }).options.html)
    expect(html).toContain(url)
  })

  it('renders the verdict badge glyph when provided', () => {
    const html = String(
      photoPinIcon({ photo: '/photos/hero.jpg', ring: '#fff', badge: '★' }).options.html,
    )
    expect(html).toContain('★')
  })
})
