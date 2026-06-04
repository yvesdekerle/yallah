import type { StoredUserActivity } from '../types/userActivity.ts'
import type { ActivityDoc } from '../types/firestore.ts'

/**
 * Map a locally-stored user activity to its Firestore document shape (minus
 * `updatedAt`, which the client sets to `serverTimestamp()`).
 *
 * Only URL photos are mirrored: uploaded photos are blobs in IndexedDB, local
 * to the device, so they can't be shared without uploading to Storage (out of
 * scope). Optional fields are omitted when absent — Firestore rejects
 * `undefined`.
 */
export function userActivityToDoc(
  a: StoredUserActivity,
): Omit<ActivityDoc, 'updatedAt'> {
  const photoUrls = a.photoRefs
    .filter((r): r is Extract<typeof r, { kind: 'url' }> => r.kind === 'url')
    .map((r) => r.url)
  return {
    id: a.id,
    title: a.title,
    tags: a.tags,
    category: a.category,
    location: a.location,
    transit: a.transit,
    description: a.description,
    ...(a.duration ? { duration: a.duration } : {}),
    ...(a.difficulty ? { difficulty: a.difficulty } : {}),
    price: a.price,
    rating: a.rating,
    pepite: a.pepite,
    secret: a.secret,
    ...(a.journee ? { journee: a.journee } : {}),
    ...(a.insolite ? { insolite: a.insolite } : {}),
    ...(a.coords ? { coords: a.coords } : {}),
    ...(a.createdBy ? { createdBy: a.createdBy } : {}),
    ...(photoUrls.length ? { photoUrls } : {}),
  }
}
