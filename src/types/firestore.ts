import type { Verdict } from './verdict.ts'
import type { ActivityCreator, Difficulty } from './activity.ts'

export type { ActivityCreator }

/**
 * Shapes of the documents we store in Firestore. Kept separate from the app's
 * domain types (Activity, VoteEntry, GoogleUser) so the wire format can evolve
 * independently of the UI model.
 *
 * Collections (see `firestore.rules`):
 *
 *   users/{uid}        → {@link UserDoc}    one per signed-in Google account
 *   activities/{id}    → {@link ActivityDoc} curated (seeded) + user-added
 *   votes/{uid}        → {@link VotesDoc}    one doc per user, all their verdicts
 *
 * Votes live in a single doc per user (not a subcollection): a trip has a
 * handful of participants, so the group screen reads the whole `votes`
 * collection in a few document reads, and a single vote is an atomic field
 * update (`activities.<id>`). 198 tiny entries are far under the 1 MB doc cap.
 */

/** `users/{uid}` — profile + the app version this account last ran. */
export interface UserDoc {
  uid: string
  name: string
  email: string
  picture?: string
  /** App version the user is running, written on every connect (see version check). */
  appVersion: string
  /** `serverTimestamp()` of the last write — millis after read. */
  updatedAt: number | null
}

/**
 * `activities/{id}` — full activity detail mirrored into Firestore. The app
 * still reads curated activities from the bundled JSON for speed/offline; this
 * mirror is the source of truth for user-added activities + shared editing.
 */
export interface ActivityDoc {
  id: string
  title: string
  tags: string[]
  category: string
  location: string
  transit: string
  description: string
  duration?: string
  difficulty?: Difficulty
  price: string
  rating: number
  pepite: boolean
  secret: boolean
  journee?: boolean
  insolite?: string
  photoUrls?: string[]
  coords?: { lat: number; lng: number }
  /** Absent ⇒ curated house pick; present ⇒ added by this user. */
  createdBy?: ActivityCreator
  updatedAt: number | null
}

/**
 * `config/app` — a single global document holding the latest published app
 * version. Every signed-in client watches it: the one running the newest build
 * publishes its version here; tabs on an older build reload (see version gate).
 */
export interface ConfigDoc {
  version: string
  updatedAt: number | null
}

/** A single verdict inside a {@link VotesDoc}. */
export interface VoteValue {
  verdict: Verdict
  quotaHit?: boolean
}

/** `votes/{uid}` — all of one user's verdicts, keyed by activity id. */
export interface VotesDoc {
  uid: string
  /** Denormalised display name so the group screen needn't join on `users`. */
  name: string
  activities: Record<string, VoteValue>
  updatedAt: number | null
}
