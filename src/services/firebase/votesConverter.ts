/**
 * Read/write codec for `votes/{uid}` documents — the place where the verdict
 * invariant is actually enforced.
 *
 * Firestore security rules can validate the document's top-level shape, but
 * they CANNOT iterate the keys of the `activities` map, so they can't check
 * that each stored verdict is one of the known ids. This module closes that
 * gap on both ends of the wire:
 *
 *   - on read  → {@link parseVotesDoc} drops any entry whose verdict isn't
 *     recognised, so a corrupt/legacy doc written by another device can never
 *     crash the group screen or poison rehydrated history.
 *   - on write → {@link sanitizeVoteValues} strips unknown verdicts before they
 *     reach Firestore, so a client bug can't persist garbage.
 *
 * It imports NO Firebase SDK (only type-only types via the helpers below), so
 * it stays out of the eager bundle and is trivially unit-testable.
 */
import { isVerdict } from '../../types/verdict.ts'
import type { VoteValue, VotesDoc } from '../../types/firestore.ts'

/**
 * Coerce a Firestore `serverTimestamp` field to epoch millis. Duck-types the
 * `Timestamp` object (`.toMillis()`) instead of importing the SDK value, so
 * this module carries no Firebase runtime dependency. Returns `null` for a
 * missing / unrecognised value.
 */
function toMillis(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

/**
 * Validate one raw `activities` entry. Returns a clean {@link VoteValue}, or
 * `null` when the verdict isn't a known id — the caller drops those.
 */
export function coerceVoteValue(value: unknown): VoteValue | null {
  if (typeof value !== 'object' || value === null) return null
  const { verdict, quotaHit } = value as {
    verdict?: unknown
    quotaHit?: unknown
  }
  if (!isVerdict(verdict)) return null
  return quotaHit === true ? { verdict, quotaHit: true } : { verdict }
}

/**
 * Parse a raw `votes/{uid}` document into a typed, sanitised {@link VotesDoc}.
 * Unknown verdicts are dropped; missing/garbled scalar fields fall back to safe
 * defaults (`uid` from the document id, empty `name`) so the group screen never
 * throws on a malformed doc.
 */
export function parseVotesDoc(
  uid: string,
  data: Record<string, unknown> | undefined,
): VotesDoc {
  const activities: Record<string, VoteValue> = {}
  const raw = (data?.activities ?? {}) as Record<string, unknown>
  for (const [id, value] of Object.entries(raw)) {
    const vote = coerceVoteValue(value)
    if (vote) activities[id] = vote
  }
  return {
    uid: typeof data?.uid === 'string' ? data.uid : uid,
    name: typeof data?.name === 'string' ? data.name : '',
    activities,
    updatedAt: toMillis(data?.updatedAt),
  }
}

/**
 * Write-side guard: keep only valid verdict entries before persisting, so an
 * unknown verdict string can never be written into the shared collection.
 */
export function sanitizeVoteValues(
  values: Record<string, VoteValue>,
): Record<string, VoteValue> {
  const clean: Record<string, VoteValue> = {}
  for (const [id, value] of Object.entries(values)) {
    const vote = coerceVoteValue(value)
    if (vote) clean[id] = vote
  }
  return clean
}
