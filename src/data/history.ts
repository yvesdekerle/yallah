import type { VoteEntry } from '../types/verdict.ts'

/**
 * Legacy verdict-id migration. This is the single place schema migrations
 * for `VoteEntry` accrete:
 *  - the "neutre" id was renamed to "whynot" — rewritten so the vote keeps
 *    counting against the right bucket;
 *  - the "skip" (plus tard) verdict was removed — those entries are dropped
 *    on load so the activity simply becomes votable again.
 */
export interface LegacyVoteEntry extends Omit<VoteEntry, 'verdict'> {
  verdict: VoteEntry['verdict'] | 'neutre' | 'skip'
}

export function migrateHistory(raw: LegacyVoteEntry[]): VoteEntry[] {
  // `continue`/early-return narrows `e.verdict` per branch, so the result is
  // a VoteEntry without any `as` cast: 'skip' is dropped, 'neutre' is rewritten
  // to 'whynot', everything else passes through.
  return raw.flatMap((e): VoteEntry[] => {
    if (e.verdict === 'skip') return []
    return [{ ...e, verdict: e.verdict === 'neutre' ? 'whynot' : e.verdict }]
  })
}
