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

export function migrateHistory(
  raw: VoteEntry[] | LegacyVoteEntry[],
): VoteEntry[] {
  return (raw as LegacyVoteEntry[])
    .filter((e) => e.verdict !== 'skip')
    .map((e) =>
      e.verdict === 'neutre' ? { ...e, verdict: 'whynot' } : (e as VoteEntry),
    )
}
