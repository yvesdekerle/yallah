/**
 * Firebase SDK boundary. This is the ONLY module that statically imports the
 * `firebase/*` SDK, so the bundler isolates the SDK into its own chunk. It must
 * never be imported statically by app/UI code — reach it through `./api.ts`,
 * which loads it with a dynamic `import()`. (Vite's `manualChunks` routes the
 * SDK to a `firebase-*` chunk; `scripts/check-bundle-size.ts` both excludes that
 * chunk from the lazy budget and asserts the SDK never leaks into the entry.)
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  deleteField,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig } from './config.ts'
import type { GoogleUser } from '../../types/user.ts'
import type { VoteEntry } from '../../types/verdict.ts'
import type {
  ActivityDoc,
  UserDoc,
  VotesDoc,
  VoteValue,
} from '../../types/firestore.ts'

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

function ensureApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig)
  return app
}
function auth(): Auth {
  authInstance ??= getAuth(ensureApp())
  return authInstance
}
function db(): Firestore {
  dbInstance ??= getFirestore(ensureApp())
  return dbInstance
}

/** Map a Firebase Auth user to our local {@link GoogleUser}. */
export function firebaseUserToGoogleUser(u: User): GoogleUser {
  const name = u.displayName?.trim() || u.email?.split('@')[0] || 'Invité'
  return {
    uid: u.uid,
    name,
    email: u.email ?? '',
    ...(u.photoURL ? { picture: u.photoURL } : {}),
  }
}

/** Open the Google sign-in popup and resolve the signed-in profile. */
export async function signInWithGoogle(): Promise<GoogleUser> {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth(), provider)
  return firebaseUserToGoogleUser(result.user)
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth())
}

/**
 * Subscribe to auth-state changes. Fires with the mapped profile on sign-in /
 * session restore, and `null` on sign-out. Returns an unsubscribe function.
 */
export function subscribeAuth(
  cb: (user: GoogleUser | null) => void,
): () => void {
  return onAuthStateChanged(auth(), (u) =>
    cb(u ? firebaseUserToGoogleUser(u) : null),
  )
}

/** Upsert the user's profile + current app version into `users/{uid}`. */
export async function upsertUserProfile(
  user: GoogleUser,
  appVersion: string,
): Promise<void> {
  await setDoc(
    doc(db(), 'users', user.uid),
    {
      uid: user.uid,
      name: user.name,
      email: user.email,
      ...(user.picture ? { picture: user.picture } : {}),
      appVersion,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * Merge one or more verdicts into the user's `votes/{uid}` document. Merge (not
 * replace) so a vote from a fresh device only ever adds/updates keys — it can
 * never wipe verdicts cast on another device.
 */
export async function saveVotes(
  uid: string,
  name: string,
  values: Record<string, VoteValue>,
): Promise<void> {
  await setDoc(
    doc(db(), 'votes', uid),
    { uid, name, activities: values, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Remove a single verdict from the user's `votes/{uid}` document (undo /
 * delete). `setDoc(merge)` rather than `updateDoc` so it can't throw if the doc
 * doesn't exist yet (e.g. deleting an activity that was never voted on).
 */
export async function removeVote(
  uid: string,
  activityId: string,
): Promise<void> {
  await setDoc(
    doc(db(), 'votes', uid),
    { activities: { [activityId]: deleteField() }, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/** One-shot read of the user's own verdicts, for rehydrating local history on sign-in. */
export async function getMyVotes(uid: string): Promise<VoteEntry[]> {
  const snap = await getDoc(doc(db(), 'votes', uid))
  const data = snap.data() as VotesDoc | undefined
  if (!data?.activities) return []
  return Object.entries(data.activities).map(([id, v]) => ({
    id,
    verdict: v.verdict,
    ...(v.quotaHit ? { quotaHit: true } : {}),
  }))
}

/** Mirror an activity's full detail into `activities/{id}`. */
export async function upsertActivity(
  activity: Omit<ActivityDoc, 'updatedAt'>,
): Promise<void> {
  await setDoc(
    doc(db(), 'activities', activity.id),
    { ...activity, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/** Listen to every user's votes (group screen). */
export function subscribeGroupVotes(
  cb: (votes: VotesDoc[]) => void,
): () => void {
  return onSnapshot(collection(db(), 'votes'), (snap) => {
    cb(snap.docs.map((d) => d.data() as VotesDoc))
  })
}

/** Listen to the roster of signed-in users (group screen). */
export function subscribeRoster(cb: (users: UserDoc[]) => void): () => void {
  return onSnapshot(collection(db(), 'users'), (snap) => {
    cb(snap.docs.map((d) => d.data() as UserDoc))
  })
}

/** Listen to the global published app version (`config/app.version`). */
export function subscribeAppVersion(
  cb: (version: string | null) => void,
): () => void {
  return onSnapshot(doc(db(), 'config', 'app'), (snap) => {
    const data = snap.data() as { version?: string } | undefined
    cb(data?.version ?? null)
  })
}

/** Publish this build's version as the global latest (`config/app.version`). */
export async function publishAppVersion(version: string): Promise<void> {
  await setDoc(
    doc(db(), 'config', 'app'),
    { version, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
