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
