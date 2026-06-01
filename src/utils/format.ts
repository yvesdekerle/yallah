/**
 * Short price string for compact UI (Card pill). Prefers the first €
 * amount (with optional preceding ~ and range), falls back to the chunk
 * before the first comma/slash/parenthesis. Strips the leading ~ so
 * "~25–35 €/pers en excursion organisée" becomes "25–35 €".
 */
export function shortPrice(price: string): string {
  const eur = price.match(/~?\s*\d[\d\s]*(?:[–-]\s*\d[\d\s]*)?\s*€/)
  if (eur) {
    return eur[0]
      .replace(/^~\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return price
    .split(/[,;/(]/)[0]!
    .replace(/^~\s*/, '')
    .trim()
}

/**
 * Reformats "Blue Bay (sud-est)" into "Blue Bay · sud-est" — converts a
 * trailing parenthesized hint into a middot-separated suffix so it reads
 * cleanly inline. Returns the original string if no trailing parens.
 */
export function formatLocation(loc: string): string {
  return loc.replace(/\s*\(([^)]+)\)\s*$/, ' · $1')
}

/**
 * Strips parenthesized clarifications from a duration string for the
 * compact Card pill. "~2h (briefing + plongée)" → "~2h", and a string
 * with multiple groups like "~4h (rando) ou ~5h (canyoning)" becomes
 * "~4h ou ~5h". The DetailModal keeps the full original text.
 */
export function shortDuration(duration: string): string {
  return duration.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
}
