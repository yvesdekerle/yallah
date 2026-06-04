/**
 * Profile of a user signed in through Firebase Auth (Google provider).
 * Stored locally under `yallah.googleUser.v1` for instant session restore, and
 * mirrored to `users/{uid}` in Firestore on connect. `name` holds the *first
 * name* where Google provides a `displayName` (falling back to the email local
 * part), matching the demo participants which are first-name only.
 */
export interface GoogleUser {
  /** Stable Firebase Auth user id (`auth.currentUser.uid`). */
  uid: string
  /** Display first name (from Google `displayName`, falling back to email). */
  name: string
  email: string
  /** Avatar URL. Optional — Google doesn't always return one. */
  picture?: string
}
