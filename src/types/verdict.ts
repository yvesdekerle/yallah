/**
 * The closed set of persisted verdicts — the single source of truth.
 * `skip` ("PLUS TARD") is intentionally absent: it advances the deck but is
 * never written to history / Firestore.
 *
 * ⚠️ Mirror these ids in `firestore.rules` (the rules can't import TS) and in
 * the client-side guard `services/firebase/votesConverter.ts`.
 */
export const VERDICT_VALUES = ['oui', 'non', 'whynot', 'top'] as const

export type Verdict = (typeof VERDICT_VALUES)[number]

/** Runtime guard: true when `v` is one of the known verdict ids. */
export function isVerdict(v: unknown): v is Verdict {
  return (
    typeof v === 'string' && (VERDICT_VALUES as readonly string[]).includes(v)
  )
}

export interface VoteEntry {
  /** Activity id (e.g. "a001"). */
  id: string
  verdict: Verdict
  /**
   * True when the user attempted a super-like ("top") but had no quota left,
   * so it was silently converted to a regular "oui". Tracked so we don't
   * decrement the quota and can show the right toast.
   */
  quotaHit?: boolean
}
