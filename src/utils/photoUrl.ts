// Safety helpers for photo URLs that originate from untrusted user input
// (pasted into the "Add activity" form). Such a URL flows into a Leaflet
// photo-pin marker via mapMarkers.ts, where it is applied as a CSSOM
// `element.style.backgroundImage = url('…')` value. `isSafePhotoUrl` rejects
// dangerous URLs at paste time; `cssUrlValue` escapes whatever still reaches
// that `url('…')` CSS-string context (e.g. values restored from localStorage).

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
 * Escape a URL for safe embedding inside a `url('…')` CSS value (assigned via
 * the CSSOM as `element.style.backgroundImage`). Backslash-hex-escapes the
 * characters that could break the url() string (`' " \` and line terminators,
 * plus `< >` for belt-and-suspenders) as CSS string escapes (`\27 ` etc.),
 * leaving `%`, parens, `&` and spaces untouched so already percent-encoded
 * URLs are not double-encoded (which would make the image 404).
 */
export function cssUrlValue(raw: string): string {
  return raw.replace(
    /['"<>\\\n\r\f]/g,
    (c) => '\\' + c.charCodeAt(0).toString(16) + ' ',
  )
}
