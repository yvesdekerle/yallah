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

/**
 * sessionStorage key recording the version we already reloaded for. Shared by
 * every "stale tab → reload" path (the Firestore gate and the version.json
 * poll) so they can't double-reload or fight each other.
 */
export const RELOADED_FOR_KEY = 'yallah.reloadedFor.v1'

/**
 * Reload the page once if `remote` is a newer version than `current`.
 *
 * Guarded via {@link RELOADED_FOR_KEY} in sessionStorage so an out-of-sync
 * value can't cause a reload loop (we only ever reload once per target
 * version). No-op when `remote` is the same or older.
 *
 * @returns true if a reload was triggered.
 */
export function reloadIfOutdated(remote: string, current: string): boolean {
  if (compareVersions(remote, current) <= 0) return false
  let already: string | null = null
  try {
    already = sessionStorage.getItem(RELOADED_FOR_KEY)
  } catch {
    already = null
  }
  if (already === remote) return false
  try {
    sessionStorage.setItem(RELOADED_FOR_KEY, remote)
  } catch {
    /* private mode — proceed without the guard */
  }
  window.location.reload()
  return true
}
