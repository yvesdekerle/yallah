import { useEffect, useRef, useState } from 'react'
import type { PhotoDraft } from './useUserActivities.ts'
import type { PhotoRef } from '../types/userActivity.ts'
import { isSafePhotoUrl } from '../utils/photoUrl.ts'

export interface PhotoItem {
  draft: PhotoDraft
  preview: string
  /** True when `preview` is an object URL we created (a picked file). */
  createdUrl: boolean
}

export interface UsePhotoLifecycle {
  photos: PhotoItem[]
  urlInput: string
  urlError: string
  addFiles: (files: FileList | null) => void
  addUrlPhoto: () => void
  removePhoto: (idx: number) => void
  onUrlInputChange: (value: string) => void
  /** Replace the list when hydrating the edit form from stored refs. */
  hydrate: (refs: PhotoRef[], resolvedUrls: string[]) => void
  /** Clear the photos + URL input, revoking any object URLs we created. */
  reset: () => void
}

/**
 * Owns the add/edit form's photo list and the picked-file object-URL lifecycle:
 * creation on pick, revocation on remove / reset / unmount, plus the paste-URL
 * validation. Extracted from useAddActivityForm (ARCH-04) so that hook stays a
 * thin field + submit orchestrator instead of a 300-line god-hook.
 */
export function usePhotoLifecycle(): UsePhotoLifecycle {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  // Object URLs created for picked-file previews, revoked on reset/unmount.
  const createdUrlsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const created = createdUrlsRef.current
    return () => created.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: PhotoItem[] = []
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file)
      createdUrlsRef.current.add(preview)
      next.push({ draft: { kind: 'file', file }, preview, createdUrl: true })
    }
    setPhotos((p) => [...p, ...next])
  }

  const addUrlPhoto = () => {
    const url = urlInput.trim()
    if (!url) return
    if (!isSafePhotoUrl(url)) {
      setUrlError('URL d’image invalide (https, http ou blob uniquement).')
      return
    }
    const ref: PhotoRef = { kind: 'url', url }
    setPhotos((p) => [
      ...p,
      { draft: { kind: 'ref', ref }, preview: url, createdUrl: false },
    ])
    setUrlInput('')
    setUrlError('')
  }

  const removePhoto = (idx: number) => {
    setPhotos((p) => {
      const item = p[idx]
      if (item?.createdUrl) {
        URL.revokeObjectURL(item.preview)
        createdUrlsRef.current.delete(item.preview)
      }
      return p.filter((_, i) => i !== idx)
    })
  }

  // Clear the URL error as soon as the user edits the field again.
  const onUrlInputChange = (value: string) => {
    setUrlInput(value)
    if (urlError) setUrlError('')
  }

  const hydrate = (refs: PhotoRef[], resolvedUrls: string[]) => {
    setPhotos(
      refs.map((ref, i) => ({
        draft: { kind: 'ref', ref },
        preview:
          ref.kind === 'url' ? ref.url : (resolvedUrls[i] ?? '/photos/hero.jpg'),
        createdUrl: false,
      })),
    )
  }

  const reset = () => {
    photos.forEach((p) => {
      if (p.createdUrl) {
        URL.revokeObjectURL(p.preview)
        createdUrlsRef.current.delete(p.preview)
      }
    })
    setPhotos([])
    setUrlInput('')
    setUrlError('')
  }

  return {
    photos,
    urlInput,
    urlError,
    addFiles,
    addUrlPhoto,
    removePhoto,
    onUrlInputChange,
    hydrate,
    reset,
  }
}
