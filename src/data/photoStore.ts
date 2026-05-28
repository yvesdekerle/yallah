/**
 * Binary photo store for user-added activities.
 *
 * Uploaded images don't fit comfortably in localStorage (≈5 MB cap, JSON
 * serialization), so their resized blobs live in IndexedDB keyed by a
 * `PhotoRef.id`. The activity record (localStorage) only keeps the id.
 *
 * This module — together with `userActivities.ts` — is the entire storage
 * surface to swap when the app moves to a backend.
 */

const DB_NAME = 'yallah'
const STORE = 'photos'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

interface StoredPhoto {
  buf: ArrayBuffer
  type: string
}

/**
 * Store (or replace) a photo blob under `id`. We persist the raw
 * `ArrayBuffer` + MIME type rather than the `Blob` itself — `Blob` doesn't
 * survive the structured-clone round-trip in every environment, whereas an
 * `ArrayBuffer` always does.
 */
export async function putPhoto(id: string, blob: Blob): Promise<void> {
  const buf = await blob.arrayBuffer()
  const record: StoredPhoto = { buf, type: blob.type || 'image/jpeg' }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, 'readwrite').put(record, id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Read a photo blob by `id` (or `undefined` if absent). */
export async function getPhoto(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(id)
    req.onsuccess = () => {
      const record = req.result as StoredPhoto | undefined
      resolve(record ? new Blob([record.buf], { type: record.type }) : undefined)
    }
    req.onerror = () => reject(req.error)
  })
}

/** Delete a photo blob by `id` (no-op if absent). */
export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Downscale an image blob to fit within `maxW`×`maxH` (preserving aspect
 * ratio, never upscaling) and re-encode as JPEG. Runs entirely client-side
 * via `<canvas>`, mirroring the sizes used by `scripts/download-photos.ts`
 * (hero 800×1000, thumbs 400×500). Returns the resized JPEG blob.
 */
export async function resizeImage(
  blob: Blob,
  maxW: number,
  maxH: number,
  quality = 0.72,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('2D canvas context unavailable')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    )
  })
}
