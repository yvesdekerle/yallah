import L from 'leaflet'

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
 */
export function photoPinIcon({
  photo,
  ring,
  badge,
  size = 44,
}: PhotoPinOptions): L.DivIcon {
  const badgeHtml = badge
    ? `<span style="
        position:absolute;right:-2px;bottom:-2px;
        width:18px;height:18px;border-radius:50%;
        background:${ring};color:#fff;font-size:11px;line-height:18px;
        text-align:center;border:2px solid #fff;
      ">${badge}</span>`
    : ''
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background-image:url('${photo}');background-size:cover;background-position:center;
        border:3px solid ${ring};box-shadow:0 2px 6px rgba(20,30,50,0.4);
      "></div>
      ${badgeHtml}
    </div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
