import { useEffect } from 'react'
import type { GoogleUser } from '../types/user.ts'
import { subscribeAuth, upsertUserProfile } from '../services/firebase/api.ts'
import { APP_VERSION } from '../constants/version.ts'

/**
 * Keep the app's `googleUser` state in sync with Firebase Auth, the source of
 * truth for the signed-in identity:
 *
 * - on sign-in / session restore (e.g. after a reload), adopt the mapped profile
 *   and mirror it (+ the running app version) into `users/{uid}` in Firestore;
 * - on sign-out (here or in another tab), clear `googleUser`.
 *
 * No-op when Firebase isn't configured (the subscription never fires), so demo
 * mode and the e2e/CI runs are untouched. Unlike the explicit sign-in handler,
 * this never clears vote history — a reload must preserve the user's votes.
 */
export function useFirebaseAuthSync(
  setGoogleUser: (user: GoogleUser | null) => void,
): void {
  useEffect(() => {
    return subscribeAuth((user) => {
      setGoogleUser(user)
      if (user) void upsertUserProfile(user, APP_VERSION)
    })
  }, [setGoogleUser])
}
