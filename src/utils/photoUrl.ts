// Safety helpers for photo URLs that originate from untrusted user input
// (pasted into the "Add activity" form). Such a URL can flow into a Leaflet
// `divIcon({ html })` sink — an innerHTML assignment — via mapMarkers.ts.

const SAFE_SCHEMES = new Set(['http:', 'https:', 'blob:'])

// Characters that would let a URL break out of `url('…')` inside a
// double-quoted HTML style attribute: the single quote (closes the CSS
// string), the double quote (closes the attribute), and angle brackets
// (open/close HTML tags).
const BREAKOUT_CHARS = /['"<>]/

/**
 * True when `raw` is a photo URL we accept at paste time: an http(s) or blob:
 * URL with no HTML/CSS breakout characters. Rejects javascript:/data:/
 * protocol-relative and anything `new URL` cannot parse.
 */
export function isSafePhotoUrl(raw: string): boolean {
  const url = raw.trim()
  if (!url || BREAKOUT_CHARS.test(url)) return false
  try {
    return SAFE_SCHEMES.has(new URL(url).protocol)
  } catch {
    return false
  }
}

/**
 * Escape a URL for safe embedding inside `url('…')` within an innerHTML string.
 * Backslash-hex-escapes only the characters dangerous in that context
 * (`' " < > \` and line terminators) as CSS string escapes (`\27 ` etc.),
 * leaving `%`, parens, `&` and spaces untouched so already percent-encoded
 * URLs are not double-encoded (which would make the image 404).
 */
export function cssUrlValue(raw: string): string {
  return raw.replace(
    /['"<>\\\n\r\f]/g,
    (c) => '\\' + c.charCodeAt(0).toString(16) + ' ',
  )
}
