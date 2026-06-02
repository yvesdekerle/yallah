import type { VoteEntry } from '../types/verdict.ts'

/**
 * Legacy verdict-id migration: the "neutre" id was renamed to "whynot".
 * Existing local histories get their entries rewritten on load so they keep
 * counting against the right bucket. This is the single place schema
 * migrations for `VoteEntry` accrete.
 */
export interface LegacyVoteEntry extends Omit<VoteEntry, 'verdict'> {
  verdict: VoteEntry['verdict'] | 'neutre'
}

export function migrateHistory(
  raw: VoteEntry[] | LegacyVoteEntry[],
): VoteEntry[] {
  return (raw as LegacyVoteEntry[]).map((e) =>
    e.verdict === 'neutre' ? { ...e, verdict: 'whynot' } : (e as VoteEntry),
  )
}
