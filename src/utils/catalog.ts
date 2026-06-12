import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'
import { STORAGE_KEYS } from '../constants/swipe.ts'

/**
 * The published catalog — the outcome of the shared activity triage
 * (/admin/goprod writes it to Firestore `activityTriage/published`). When
 * present, the app's curated deck is the bundled list MINUS `removed` PLUS
 * `added`, and votes referencing a retired activity follow `removed`:
 * merged → retargeted to the kept representative, écartée → dropped.
 *
 * Pure helpers only — no Firebase import (main.tsx + the Firestore client both
 * use this module, so it must stay dependency-free to avoid cycles).
 */
export interface PublishedCatalog {
  /** Triage version (`activityTriage/current`) the publication derives from. */
  sourceVersion: number
  /** Publication time (epoch ms) — change-detection signature. */
  publishedAtMs: number
  /** Retired activity ids → id of the merge representative that replaces
      them, or null when simply removed (écartée). */
  removed: Record<string, string | null>
  /** Activities added in the triage tool, appended to the curated deck. */
  added: Activity[]
}

/** Validate an untrusted payload (Firestore doc / localStorage) into a catalog. */
export function parseCatalog(raw: unknown): PublishedCatalog | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.removed !== 'object' || o.removed === null) return null
  if (!Array.isArray(o.added)) return null
  const removed: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(o.removed as Record<string, unknown>)) {
    if (v === null || typeof v === 'string') removed[k] = v
  }
  const added = (o.added as unknown[])
    .filter(
      (a): a is Activity =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as Activity).id === 'string' &&
        typeof (a as Activity).title === 'string',
    )
    .map((a) => ({ ...a, tags: Array.isArray(a.tags) ? a.tags : [] }))
  return {
    sourceVersion: typeof o.sourceVersion === 'number' ? o.sourceVersion : 0,
    publishedAtMs: typeof o.publishedAtMs === 'number' ? o.publishedAtMs : 0,
    removed,
    added,
  }
}

export function loadCachedCatalog(): PublishedCatalog | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.catalog)
    if (!raw) return null
    return parseCatalog(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Persist (or clear) the cached catalog. Returns false when storage failed —
    callers must NOT reload on a failed save (it would loop). */
export function saveCachedCatalog(catalog: PublishedCatalog | null): boolean {
  try {
    if (catalog) {
      localStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(catalog))
    } else {
      localStorage.removeItem(STORAGE_KEYS.catalog)
    }
    return true
  } catch {
    return false
  }
}

/** Signature comparing the booted catalog against a freshly fetched one. */
export function catalogSignature(catalog: PublishedCatalog | null): string {
  return catalog ? `${catalog.sourceVersion}:${catalog.publishedAtMs}` : 'none'
}

/** The effective curated deck: bundled activities minus retired, plus added. */
export function applyCatalog(
  activities: Activity[],
  catalog: PublishedCatalog | null,
): Activity[] {
  if (!catalog) return activities
  const kept = activities.filter((a) => !(a.id in catalog.removed))
  const ids = new Set(kept.map((a) => a.id))
  const added = catalog.added.filter(
    (a) => !ids.has(a.id) && !(a.id in catalog.removed),
  )
  return [...kept, ...added]
}

/**
 * Remap one voted activity id through the catalog: unchanged when the activity
 * survives, retargeted to its merge representative, or null when the vote must
 * be dropped (activity écartée). Follows merge chains and bails on cycles.
 */
export function remapVoteId(
  id: string,
  catalog: PublishedCatalog | null,
): string | null {
  if (!catalog) return id
  let current = id
  const seen = new Set<string>()
  while (current in catalog.removed) {
    if (seen.has(current)) return null
    seen.add(current)
    const next = catalog.removed[current]
    if (next == null) return null
    current = next
  }
  return current
}

/** Migrate a vote history through the catalog (first vote wins on collision —
    e.g. both a merged activity and its representative were voted). */
export function migrateVoteEntries(
  entries: VoteEntry[],
  catalog: PublishedCatalog | null,
): VoteEntry[] {
  if (!catalog) return entries
  const out: VoteEntry[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    const id = remapVoteId(entry.id, catalog)
    if (id === null || seen.has(id)) continue
    seen.add(id)
    out.push(id === entry.id ? entry : { ...entry, id })
  }
  return out
}

/** Same remap for a votes map keyed by activity id (Firestore votes docs). */
export function remapVoteValues<T>(
  values: Record<string, T>,
  catalog: PublishedCatalog | null,
): Record<string, T> {
  if (!catalog) return values
  const out: Record<string, T> = {}
  for (const [id, value] of Object.entries(values)) {
    const next = remapVoteId(id, catalog)
    if (next !== null && !(next in out)) out[next] = value
  }
  return out
}
