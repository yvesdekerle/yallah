import L from 'leaflet'
import { cssUrlValue } from './photoUrl.ts'

interface PhotoPinOptions {
  /** Hero photo URL shown inside the circle. */
  photo: string
  /** Ring + badge colour (verdict colour on the aggregated map, coral on the mini-map). */
  ring: string
  /** Optional glyph in the corner badge (e.g. ♥ for a like, ★ for a super-like). */
  badge?: string
  /** Diameter in px. */
  size?: number
}

/**
 * Circular hero-photo Leaflet marker. Shared by the aggregated FullscreenMap
 * and the DetailModal mini-map so a pin reads the same everywhere.
 *
 * The marker DOM is built with the DOM API and handed to Leaflet as an
 * `Element` (Leaflet `appendChild`s it instead of assigning innerHTML). Static
 * styling lives in the `.yallah-photo-pin*` classes (src/index.css); the
 * dynamic ring colour, photo and badge glyph are applied via the CSSOM
 * (`element.style.*`) and `textContent`. Two payoffs:
 *  - **CSP**: no declarative `style="…"` attribute is ever produced, so the
 *    markers don't depend on `style-src 'unsafe-inline'`.
 *  - **XSS**: the untrusted photo URL only reaches `element.style.backgroundImage`
 *    (a CSSOM write — it cannot create DOM) and the badge only reaches
 *    `textContent`, so injection is structurally impossible. `cssUrlValue`
 *    additionally keeps the URL from breaking the `url('…')` CSS string.
 */
export function photoPinIcon({
  photo,
  ring,
  badge,
  size = 44,
}: PhotoPinOptions): L.DivIcon {
  const root = document.createElement('div')
  root.className = 'yallah-photo-pin'

  const circle = document.createElement('div')
  circle.className = 'yallah-photo-pin__circle'
  circle.style.borderColor = ring
  circle.style.backgroundImage = `url('${cssUrlValue(photo)}')`
  root.appendChild(circle)

  if (badge) {
    const badgeEl = document.createElement('span')
    badgeEl.className = 'yallah-photo-pin__badge'
    badgeEl.style.background = ring
    badgeEl.textContent = badge
    root.appendChild(badgeEl)
  }

  return L.divIcon({
    html: root,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
