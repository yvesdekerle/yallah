import { useEffect, useState } from 'react'
import {
  subscribeRoster,
  subscribeGroupVotes,
} from '../services/firebase/api.ts'
import type { UserDoc, VotesDoc, VoteValue } from '../types/firestore.ts'

/** A group member with their votes, ready for the Groupe / detail views. */
export interface GroupMember {
  uid: string
  name: string
  picture?: string
  /** Number of activities this member has voted on. */
  voteCount: number
  /** Their verdicts, keyed by activity id. */
  votes: Record<string, VoteValue>
}

export interface GroupData {
  /** Members sorted alphabetically by first name (locale-aware). */
  members: GroupMember[]
}

/**
 * Subscribe (real time) to the roster (`users`) + everyone's votes (`votes`)
 * and merge them into a sorted member list. Used in Google mode to replace the
 * hard-coded demo participants with the real signed-in users + their real
 * votes.
 *
 * No-op (empty members) when `enabled` is false (demo mode) or Firebase isn't
 * configured — the subscriptions never fire.
 */
export function useGroupData(enabled: boolean): GroupData {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [votes, setVotes] = useState<VotesDoc[]>([])

  useEffect(() => {
    if (!enabled) return
    const offUsers = subscribeRoster(setUsers)
    const offVotes = subscribeGroupVotes(setVotes)
    return () => {
      offUsers()
      offVotes()
    }
  }, [enabled])

  // Disabled (demo / logged out) ⇒ no members. We gate the derived value rather
  // than clearing `users`/`votes` in the effect (which would trip
  // react-hooks/set-state-in-effect); the stale raw state is simply ignored and
  // refreshed by the next subscription when re-enabled.
  const votesByUid = new Map(votes.map((v) => [v.uid, v]))
  const members: GroupMember[] = !enabled
    ? []
    : users
        .map((u) => {
      const v = votesByUid.get(u.uid)
      const activities = v?.activities ?? {}
      return {
        uid: u.uid,
        name: u.name,
        ...(u.picture ? { picture: u.picture } : {}),
        voteCount: Object.keys(activities).length,
        votes: activities,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

  return { members }
}
