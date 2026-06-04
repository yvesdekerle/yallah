/**
 * App-facing Firebase facade. Safe to import statically from UI code: it pulls
 * in NO Firebase SDK directly — the heavy `./client.ts` (and the SDK) is loaded
 * with a dynamic `import()` only on first use, so Firebase lands in its own
 * lazy chunk instead of the eager entry.
 *
 * Every call is a no-op (writes) or a no-op-unsubscribe (listeners) when
 * Firebase isn't configured, so the app runs unchanged in demo mode / CI / e2e.
 */
import { firebaseAvailable } from './config.ts'
import type { GoogleUser } from '../../types/user.ts'
import type { VoteEntry } from '../../types/verdict.ts'
import type {
  ActivityDoc,
  UserDoc,
  VotesDoc,
  VoteValue,
} from '../../types/firestore.ts'

export { firebaseAvailable }

type Client = typeof import('./client.ts')

let clientPromise: Promise<Client> | null = null
function loadClient(): Promise<Client> {
  clientPromise ??= import('./client.ts')
  return clientPromise
}

/**
 * Wire up a Firestore/Auth listener lazily. Returns an unsubscribe immediately;
 * the real listener attaches once the SDK chunk resolves (unless cancelled
 * first). No-op unsubscribe when Firebase is unavailable.
 */
function lazySubscribe(start: (c: Client) => () => void): () => void {
  if (!firebaseAvailable) return () => {}
  let unsub: (() => void) | null = null
  let cancelled = false
  void loadClient().then((c) => {
    if (cancelled) return
    unsub = start(c)
  })
  return () => {
    cancelled = true
    unsub?.()
  }
}

export async function signInWithGoogle(): Promise<GoogleUser> {
  if (!firebaseAvailable) throw new Error('Firebase not configured')
  return (await loadClient()).signInWithGoogle()
}

export async function signOutFirebase(): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).signOutFirebase()
}

export function subscribeAuth(
  cb: (user: GoogleUser | null) => void,
): () => void {
  return lazySubscribe((c) => c.subscribeAuth(cb))
}

export async function upsertUserProfile(
  user: GoogleUser,
  appVersion: string,
): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).upsertUserProfile(user, appVersion)
}

export async function saveVotes(
  uid: string,
  name: string,
  values: Record<string, VoteValue>,
): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).saveVotes(uid, name, values)
}

export async function removeVote(
  uid: string,
  activityId: string,
): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).removeVote(uid, activityId)
}

export async function getMyVotes(uid: string): Promise<VoteEntry[]> {
  if (!firebaseAvailable) return []
  return (await loadClient()).getMyVotes(uid)
}

export async function upsertActivity(
  activity: Omit<ActivityDoc, 'updatedAt'>,
): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).upsertActivity(activity)
}

export function subscribeGroupVotes(cb: (votes: VotesDoc[]) => void): () => void {
  return lazySubscribe((c) => c.subscribeGroupVotes(cb))
}

export function subscribeRoster(cb: (users: UserDoc[]) => void): () => void {
  return lazySubscribe((c) => c.subscribeRoster(cb))
}

export function subscribeAppVersion(
  cb: (version: string | null) => void,
): () => void {
  return lazySubscribe((c) => c.subscribeAppVersion(cb))
}

export async function publishAppVersion(version: string): Promise<void> {
  if (!firebaseAvailable) return
  await (await loadClient()).publishAppVersion(version)
}
