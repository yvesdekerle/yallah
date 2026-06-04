/**
 * Compare two dotted version strings (e.g. "1.0.3" vs "1.10.0") numerically,
 * segment by segment, padding the shorter with zeros. Non-numeric / malformed
 * segments are treated as 0.
 *
 * @returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.')
  const pb = b.split('.')
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = Number.parseInt(pa[i] ?? '0', 10) || 0
    const nb = Number.parseInt(pb[i] ?? '0', 10) || 0
    if (na < nb) return -1
    if (na > nb) return 1
  }
  return 0
}
