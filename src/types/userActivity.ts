import type { Activity } from './activity.ts'

/**
 * A single photo attached to a user-added activity. Either a pasted remote URL
 * or a reference to a blob stored in IndexedDB (see `data/photoStore.ts`).
 */
export type PhotoRef =
  | { kind: 'url'; url: string }
  | { kind: 'upload'; id: string }

/**
 * Persisted shape of a user-added activity (localStorage key
 * `yallah.userActivities.v1`). Extends the curated `Activity` with the photo
 * references, coordinates and a creation timestamp. `photoRefs[0]` is the hero.
 */
export interface StoredUserActivity extends Activity {
  userAdded: true
  photoRefs: PhotoRef[]
  coords?: { lat: number; lng: number }
  createdAt: number
}
