import { describe, it, expect } from 'vitest'
import { photoPinIcon } from './mapMarkers.ts'

// The marker is now built with the DOM API; `options.html` is the root Element
// (not an HTML string). Injection is therefore structural: the photo URL only
// reaches a CSSOM background-image and the badge only reaches textContent, so a
// hostile value can never become an element. We assert on the built DOM tree.
function pinRoot(opts: Parameters<typeof photoPinIcon>[0]): HTMLElement {
  return photoPinIcon(opts).options.html as HTMLElement
}
function descendantTags(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*')).map((el) =>
    el.tagName.toLowerCase(),
  )
}

describe('photoPinIcon — injection safety', () => {
  it('a malicious photo URL cannot inject elements into the marker', () => {
    const payload = "https://evil/x.jpg');}</style><img src=x onerror=alert(1)>"
    const tags = descendantTags(pinRoot({ photo: payload, ring: '#fff' }))
    expect(tags).not.toContain('img')
    expect(tags).not.toContain('script')
    expect(tags).not.toContain('style')
    // Only the marker's own structure exists (the circle div).
    expect(tags.every((t) => t === 'div' || t === 'span')).toBe(true)
  })

  it('a value loaded from localStorage (never paste-validated) still renders safely', () => {
    // A URL persisted in user activities bypasses paste-time validation, so the
    // CSSOM sink here is the actual security boundary.
    const stored = "x'><svg onload=alert(1)>"
    const tags = descendantTags(pinRoot({ photo: stored, ring: '#fff' }))
    expect(tags).not.toContain('svg')
    expect(tags.every((t) => t === 'div' || t === 'span')).toBe(true)
  })

  it('applies the photo as a CSS background-image, not as markup, with no double-encoding', () => {
    const url = 'https://images.pexels.com/photos/1/a%20b.jpg?auto=compress&w=400'
    const circle = pinRoot({ photo: url, ring: '#fff' }).querySelector(
      '.yallah-photo-pin__circle',
    ) as HTMLElement
    // The clean URL has no breakout chars, so cssUrlValue leaves it untouched:
    // it survives verbatim inside the url('…') CSSOM value.
    expect(circle.style.backgroundImage).toContain(url)
  })

  it('renders the verdict badge glyph as text content', () => {
    const badge = pinRoot({
      photo: '/photos/hero.jpg',
      ring: '#fff',
      badge: '★',
    }).querySelector('.yallah-photo-pin__badge')
    expect(badge?.textContent).toBe('★')
  })

  it('omits the badge element when no glyph is provided', () => {
    const root = pinRoot({ photo: '/photos/hero.jpg', ring: '#fff' })
    expect(root.querySelector('.yallah-photo-pin__badge')).toBeNull()
  })

  it('applies the ring colour via the CSSOM (circle border + badge background)', () => {
    const root = pinRoot({ photo: '/p.jpg', ring: 'rgb(255, 203, 69)', badge: '★' })
    const circle = root.querySelector('.yallah-photo-pin__circle') as HTMLElement
    const badge = root.querySelector('.yallah-photo-pin__badge') as HTMLElement
    expect(circle.style.borderColor).toBe('rgb(255, 203, 69)')
    expect(badge.style.background).toBe('rgb(255, 203, 69)')
  })
})
