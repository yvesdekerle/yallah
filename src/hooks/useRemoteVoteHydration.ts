import { useEffect } from 'react'
import type { VoteEntry } from '../types/verdict.ts'
import { getMyVotes } from '../services/firebase/api.ts'

/**
 * On Google sign-in / session restore, rehydrate the local vote history from
 * the user's `votes/{uid}` document so a returning user — or a fresh device —
 * gets their votes back instead of an empty deck. Without this, the persisted
 * votes are written but never read, so the feature is invisible end-to-end.
 *
 * One-shot read (not a live subscription) to avoid a write→snapshot→write loop
 * with the local-first write path: local history stays the source of truth for
 * the session; each new vote is mirrored to Firestore as it happens.
 *
 * Only replaces local history when the remote has votes — a brand-new user (no
 * remote votes) keeps their just-started local session. No-op in demo mode /
 * without Firebase (`uid` null or `getMyVotes` returns []).
 */
export function useRemoteVoteHydration(
  uid: string | null,
  replaceHistory: (entries: VoteEntry[]) => void,
): void {
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    void getMyVotes(uid).then((entries) => {
      if (!cancelled && entries.length > 0) replaceHistory(entries)
    })
    return () => {
      cancelled = true
    }
  }, [uid, replaceHistory])
}
