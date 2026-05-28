import type { StoredUserActivity } from '../types/userActivity.ts'

/**
 * localStorage persistence for user-added activities.
 *
 * Together with `photoStore.ts` this is the entire local-storage surface; the
 * future backend migration should only need to reimplement these two modules.
 */

export const USER_ACTIVITIES_KEY = 'yallah.userActivities.v1'

/** Read the persisted user activities. Returns `[]` on miss or corrupt JSON. */
export function loadUserActivities(): StoredUserActivity[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(USER_ACTIVITIES_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredUserActivity[]) : []
  } catch {
    return []
  }
}

/** Overwrite the persisted user activities. Storage failures are swallowed. */
export function persistUserActivities(list: StoredUserActivity[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_ACTIVITIES_KEY, JSON.stringify(list))
  } catch {
    // Quota exceeded / private mode — keep the in-memory list as source of truth.
  }
}

/** Generate a collision-free id for a user activity (prefix `u-`). */
export function makeUserId(): string {
  return `u-${crypto.randomUUID()}`
}
