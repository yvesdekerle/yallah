import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, ActivityCreator, Difficulty } from '../types/activity.ts'
import type { PhotoRef, StoredUserActivity } from '../types/userActivity.ts'
import {
  loadUserActivities,
  persistUserActivities,
  makeUserId,
} from '../data/userActivities.ts'
import { deletePhoto, getPhoto, putPhoto, resizeImage } from '../data/photoStore.ts'

/** A photo as held by the add/edit form before persistence. */
export type PhotoDraft =
  | { kind: 'ref'; ref: PhotoRef } // keep an existing ref (url or stored upload)
  | { kind: 'file'; file: File } // a freshly-picked file to resize + store

/** Editable content of a user activity (everything except generated fields). */
export interface UserActivityInput {
  title: string
  tags: string[]
  category: string
  location: string
  transit: string
  description: string
  duration?: string | undefined
  difficulty?: Difficulty | undefined
  price: string
  rating: number
  pepite: boolean
  secret: boolean
  insolite?: string | undefined
  coords?: { lat: number; lng: number } | undefined
  photos: PhotoDraft[]
}

export interface UseUserActivities {
  /** Runtime activities (with `userAdded`, resolved `photoUrls`, `coords`). */
  userActivities: Activity[]
  /** The persisted records — handy for pre-filling the edit form. */
  stored: StoredUserActivity[]
  /** Add a new activity, tagging it with its creator. Returns the saved record. */
  add: (
    input: UserActivityInput,
    creator?: ActivityCreator,
  ) => Promise<StoredUserActivity>
  /** Edit an existing activity (creator is preserved). Returns the saved record. */
  update: (
    id: string,
    input: UserActivityInput,
  ) => Promise<StoredUserActivity | null>
  remove: (id: string) => Promise<void>
}

const HERO_MAX_W = 800
const HERO_MAX_H = 1000

/** Resize+store any `file` drafts; keep existing refs. Returns ordered refs. */
async function materializePhotos(photos: PhotoDraft[]): Promise<PhotoRef[]> {
  const refs: PhotoRef[] = []
  for (const p of photos) {
    if (p.kind === 'ref') {
      refs.push(p.ref)
    } else {
      const resized = await resizeImage(p.file, HERO_MAX_W, HERO_MAX_H)
      const id = `p-${crypto.randomUUID()}`
      await putPhoto(id, resized)
      refs.push({ kind: 'upload', id })
    }
  }
  return refs
}

/** Narrows a PhotoRef to the upload variant — lets `.filter` carry the type
    through so the `.id` access needs no cast. */
const isUpload = (r: PhotoRef): r is Extract<PhotoRef, { kind: 'upload' }> =>
  r.kind === 'upload'

/** Upload-ref ids in `refs` that aren't in `keep` — safe to delete from IDB. */
function orphanedUploadIds(refs: PhotoRef[], keep: PhotoRef[]): string[] {
  const kept = new Set(keep.filter(isUpload).map((r) => r.id))
  return refs
    .filter(isUpload)
    .filter((r) => !kept.has(r.id))
    .map((r) => r.id)
}

function buildRecord(
  input: UserActivityInput,
  photoRefs: PhotoRef[],
  base: {
    id: string
    number: number
    createdAt: number
    createdBy?: ActivityCreator
  },
): StoredUserActivity {
  return {
    id: base.id,
    number: base.number,
    title: input.title,
    tags: input.tags,
    category: input.category,
    location: input.location,
    transit: input.transit,
    description: input.description,
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    price: input.price,
    rating: input.rating,
    pepite: input.pepite,
    secret: input.secret,
    ...(input.insolite ? { insolite: input.insolite } : {}),
    ...(input.coords ? { coords: input.coords } : {}),
    ...(base.createdBy ? { createdBy: base.createdBy } : {}),
    userAdded: true,
    photoRefs,
    createdAt: base.createdAt,
  }
}

/**
 * Owns the user-added activities: persistence (localStorage), photo blob
 * hydration (IndexedDB → object URLs), and the add/update/remove actions.
 *
 * Photo object URLs are created in an effect and revoked when the list
 * changes or the hook unmounts, so they don't leak.
 */
export function useUserActivities(): UseUserActivities {
  const [stored, setStored] = useState<StoredUserActivity[]>(() =>
    loadUserActivities(),
  )
  const [photoUrlMap, setPhotoUrlMap] = useState<Record<string, string[]>>({})
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    void (async () => {
      const map: Record<string, string[]> = {}
      for (const a of stored) {
        const urls: string[] = []
        for (const ref of a.photoRefs) {
          if (ref.kind === 'url') {
            urls.push(ref.url)
          } else {
            const blob = await getPhoto(ref.id)
            if (blob) {
              const u = URL.createObjectURL(blob)
              created.push(u)
              urls.push(u)
            }
          }
        }
        map[a.id] = urls
      }
      // `cancelled` is flipped true by the cleanup below when this run is
      // superseded before its async work finishes. TS's flow analysis can't
      // model that cross-closure async mutation, so it wrongly narrows
      // `cancelled` to `false` here.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (cancelled) {
        created.forEach((u) => URL.revokeObjectURL(u))
        return
      }
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      objectUrlsRef.current = created
      setPhotoUrlMap(map)
    })()
    return () => {
      cancelled = true
    }
  }, [stored])

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  const persist = useCallback((next: StoredUserActivity[]) => {
    persistUserActivities(next)
    setStored(next)
  }, [])

  const add = useCallback(
    async (input: UserActivityInput, creator?: ActivityCreator) => {
      const photoRefs = await materializePhotos(input.photos)
      const record = buildRecord(input, photoRefs, {
        id: makeUserId(),
        number: 900 + stored.length,
        createdAt: Date.now(),
        ...(creator ? { createdBy: creator } : {}),
      })
      persist([...stored, record])
      return record
    },
    [stored, persist],
  )

  const update = useCallback(
    async (id: string, input: UserActivityInput) => {
      const existing = stored.find((s) => s.id === id)
      if (!existing) return null
      const photoRefs = await materializePhotos(input.photos)
      for (const orphan of orphanedUploadIds(existing.photoRefs, photoRefs)) {
        await deletePhoto(orphan)
      }
      const record = buildRecord(input, photoRefs, {
        id: existing.id,
        number: existing.number,
        createdAt: existing.createdAt,
        // Creator is set once at creation and preserved across edits.
        ...(existing.createdBy ? { createdBy: existing.createdBy } : {}),
      })
      persist(stored.map((s) => (s.id === id ? record : s)))
      return record
    },
    [stored, persist],
  )

  const remove = useCallback(
    async (id: string) => {
      const existing = stored.find((s) => s.id === id)
      if (existing) {
        for (const ref of existing.photoRefs) {
          if (ref.kind === 'upload') await deletePhoto(ref.id)
        }
      }
      persist(stored.filter((s) => s.id !== id))
    },
    [stored, persist],
  )

  const userActivities = useMemo<Activity[]>(
    () =>
      stored.map((s) => ({
        ...s,
        userAdded: true,
        photoUrls: photoUrlMap[s.id] ?? [],
      })),
    [stored, photoUrlMap],
  )

  return { userActivities, stored, add, update, remove }
}
