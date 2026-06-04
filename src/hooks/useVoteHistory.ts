import { useCallback, useMemo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { useLocalStorage } from './useLocalStorage.ts'
import { STORAGE_KEYS, SUPER_MAX } from '../constants/swipe.ts'
import { coordsFor } from '../utils/coords.ts'
import { migrateHistory } from '../data/history.ts'

/**
 * Owns the persisted vote history + everything derived from it (super-like
 * quota, all-voted flag) and the pure mutations. Deliberately free of UI
 * side-effects (toast/done) — the caller orchestrates those so this hook
 * stays a self-contained data layer and avoids coupling to tab/nav state.
 */
export function useVoteHistory(allActivities: Activity[]) {
  const [rawHistory, setHistory] = useLocalStorage<VoteEntry[]>(
    STORAGE_KEYS.history,
    [],
  )
  // useMemo so callers don't see a fresh array on every render unless the
  // underlying storage changed — several downstream memos key on its identity.
  const history = useMemo(() => migrateHistory(rawHistory), [rawHistory])

  const superRemaining = useMemo(() => {
    const used = history.filter((h) => h.verdict === 'top' && !h.quotaHit).length
    return Math.max(0, SUPER_MAX - used)
  }, [history])

  // True once every activity has a vote — drives the "Revoir les votes ?"
  // prompt. Derived from history so it's correct regardless of how the votes
  // were made (swipe, random fill, review-mode upserts).
  const allVoted = useMemo(() => {
    if (allActivities.length === 0) return false
    const voted = new Set(history.map((h) => h.id))
    return allActivities.every((a) => voted.has(a.id))
  }, [history, allActivities])

  const appendVote = useCallback(
    (entry: VoteEntry) => {
      setHistory((h) => [...h, entry])
    },
    [setHistory],
  )

  // Upsert by activity id — used in review mode and from the Résultats-row
  // detail, where we never want duplicates (the user is editing their vote).
  // Replaces the entry wholesale (intentionally dropping any prior `quotaHit`),
  // so re-voting a quota-downgraded pick back up to a super-like counts
  // correctly against the quota instead of carrying a stale free-pass flag.
  const upsertVote = useCallback(
    (id: string, verdict: Verdict, meta?: { quotaHit?: boolean }) => {
      const entry: VoteEntry = {
        id,
        verdict,
        ...(meta?.quotaHit ? { quotaHit: true } : {}),
      }
      setHistory((h) => {
        const idx = h.findIndex((e) => e.id === id)
        if (idx < 0) return [...h, entry]
        const next = [...h]
        next[idx] = entry
        return next
      })
    },
    [setHistory],
  )

  const undoVote = useCallback(() => {
    setHistory((h) => h.slice(0, -1))
  }, [setHistory])

  /**
   * Fill every not-yet-voted activity with a random verdict, guaranteeing 2-3
   * super-likes (clamped to remaining quota + pool size), biased toward
   * activities with coords so they surface as map pins. Returns the additions
   * (empty when nothing was missing) — the caller decides done/toast.
   */
  const randomFillVotes = useCallback((): VoteEntry[] => {
    const votedIds = new Set(history.map((h) => h.id))
    const missing = allActivities.filter((a) => !votedIds.has(a.id))
    if (missing.length === 0) return []

    const wantSupers = 2 + Math.floor(Math.random() * 2) // 2 or 3
    const actualSupers = Math.min(wantSupers, superRemaining, missing.length)
    const shuffle = <T,>(arr: T[]): T[] =>
      [...arr]
        .map((a) => ({ a, r: Math.random() }))
        .sort((x, y) => x.r - y.r)
        .map((x) => x.a)
    const withCoords = shuffle(missing.filter((a) => coordsFor(a) !== null))
    const withoutCoords = shuffle(missing.filter((a) => coordsFor(a) === null))
    const superPool = [...withCoords, ...withoutCoords]
    const superLikeIds = new Set(
      superPool.slice(0, actualSupers).map((a) => a.id),
    )

    const passive: Verdict[] = ['oui', 'non', 'whynot']
    const additions: VoteEntry[] = missing.map((a) => ({
      id: a.id,
      verdict: superLikeIds.has(a.id)
        ? 'top'
        : passive[Math.floor(Math.random() * passive.length)]!,
    }))
    setHistory((h) => [...h, ...additions])
    return additions
  }, [history, allActivities, setHistory, superRemaining])

  const clearHistory = useCallback(() => setHistory([]), [setHistory])

  // Replace the whole history — used to rehydrate from Firestore on Google
  // sign-in so a returning user / fresh device gets their votes back.
  const replaceHistory = useCallback(
    (entries: VoteEntry[]) => setHistory(entries),
    [setHistory],
  )

  const removeVotesFor = useCallback(
    (id: string) => {
      setHistory((h) => h.filter((e) => e.id !== id))
    },
    [setHistory],
  )

  return {
    history,
    superRemaining,
    allVoted,
    appendVote,
    upsertVote,
    undoVote,
    randomFillVotes,
    clearHistory,
    replaceHistory,
    removeVotesFor,
  }
}
