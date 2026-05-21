export type Verdict = 'oui' | 'non' | 'neutre' | 'top'

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
