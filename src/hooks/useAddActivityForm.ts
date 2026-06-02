import { useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, Difficulty } from '../types/activity.ts'
import type { PhotoRef, StoredUserActivity } from '../types/userActivity.ts'
import type { PhotoDraft, UserActivityInput } from './useUserActivities.ts'
import { ACTIVITIES } from '../data/activities.ts'
import { isSafePhotoUrl } from '../utils/photoUrl.ts'

export const DIFFICULTIES: Difficulty[] = [
  { dot: '🟢', label: 'Facile' },
  { dot: '🟡', label: 'Modérée' },
  { dot: '🟠', label: 'Difficile' },
  { dot: '🔴', label: 'Très difficile' },
]

// 💎 / 🗝️ are not free tags — they mirror the pépite / secret flags. The
// dedicated toggles are the single source of truth, so we keep them out of
// the emoji palette and re-derive them into `tags` at submit time.
const PEPITE_TAG = '💎'
const SECRET_TAG = '🗝️'
const SPECIAL_TAGS = [PEPITE_TAG, SECRET_TAG]

export interface PhotoItem {
  draft: PhotoDraft
  preview: string
  /** True when `preview` is an object URL we created (a picked file). */
  createdUrl: boolean
}

interface LatLng {
  lat: number
  lng: number
}

const EMPTY = {
  title: '',
  description: '',
  location: '',
  transit: '',
  duration: '',
  price: '',
  insolite: '',
  rating: 0,
  tags: [] as string[],
  pepite: false,
  secret: false,
}

interface UseAddActivityFormArgs {
  userActivities: Activity[]
  onAdd: (input: UserActivityInput) => Promise<void>
  onUpdate: (id: string, input: UserActivityInput) => Promise<void>
}

/**
 * Owns the entire add/edit-activity form: field state, the picked-file photo
 * lifecycle (object-URL creation + revocation on remove/reset/unmount), URL
 * validation, edit-record hydration, and submit. Kept as one hook (rather than
 * a separate usePhotoPicker) because reset/submit/edit are entangled with the
 * photo list — splitting would just draw a boundary through that coupling.
 */
export function useAddActivityForm({
  userActivities,
  onAdd,
  onUpdate,
}: UseAddActivityFormArgs) {
  const categories = useMemo(
    () => Array.from(new Set(ACTIVITIES.map((a) => a.category))),
    [],
  )
  // Every emoji tag used across the curated activities, offered as a palette
  // (minus 💎 / 🗝️, which the Pépite / Secret toggles own).
  const existingTags = useMemo(
    () =>
      Array.from(new Set(ACTIVITIES.flatMap((a) => a.tags))).filter(
        (t) => !SPECIAL_TAGS.includes(t),
      ),
    [],
  )

  const [editingId, setEditingId] = useState<string | null>(null)
  const [fields, setFields] = useState({ ...EMPTY })
  const [categoryMode, setCategoryMode] = useState<'preset' | 'other'>('preset')
  const [category, setCategory] = useState(categories[0] ?? '')
  const [categoryOther, setCategoryOther] = useState('')
  const [difficultyIdx, setDifficultyIdx] = useState(-1)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [saving, setSaving] = useState(false)

  // Object URLs created for picked-file previews, revoked on reset/unmount.
  const createdUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const created = createdUrlsRef.current
    return () => created.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const resetForm = () => {
    photos.forEach((p) => {
      if (p.createdUrl) {
        URL.revokeObjectURL(p.preview)
        createdUrlsRef.current.delete(p.preview)
      }
    })
    setEditingId(null)
    setFields({ ...EMPTY })
    setCategoryMode('preset')
    setCategory(categories[0] ?? '')
    setCategoryOther('')
    setDifficultyIdx(-1)
    setPhotos([])
    setCoords(null)
    setTagInput('')
    setUrlInput('')
  }

  const startEdit = (record: StoredUserActivity) => {
    const runtime = userActivities.find((a) => a.id === record.id)
    const urls = runtime?.photoUrls ?? []
    const items: PhotoItem[] = record.photoRefs.map((ref, i) => ({
      draft: { kind: 'ref', ref },
      preview: ref.kind === 'url' ? ref.url : (urls[i] ?? '/photos/hero.jpg'),
      createdUrl: false,
    }))
    setEditingId(record.id)
    setFields({
      title: record.title,
      description: record.description,
      location: record.location,
      transit: record.transit,
      duration: record.duration ?? '',
      price: record.price,
      insolite: record.insolite ?? '',
      rating: record.rating,
      tags: record.tags,
      pepite: record.pepite,
      secret: record.secret,
    })
    if (categories.includes(record.category)) {
      setCategoryMode('preset')
      setCategory(record.category)
      setCategoryOther('')
    } else {
      setCategoryMode('other')
      setCategoryOther(record.category)
    }
    setDifficultyIdx(
      record.difficulty
        ? DIFFICULTIES.findIndex((d) => d.label === record.difficulty!.label)
        : -1,
    )
    setPhotos(items)
    setCoords(record.coords ?? null)
  }

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
    setPhotos((p) => [...p, { draft: { kind: 'ref', ref }, preview: url, createdUrl: false }])
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

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    setFields((f) => (f.tags.includes(t) ? f : { ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }

  const toggleTag = (tag: string) =>
    setFields((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }))

  // Clear the URL error as soon as the user edits the field again.
  const onUrlInputChange = (value: string) => {
    setUrlInput(value)
    if (urlError) setUrlError('')
  }

  // The <select> emits the preset value or the `__other__` sentinel.
  const onCategoryChange = (value: string) => {
    if (value === '__other__') setCategoryMode('other')
    else {
      setCategoryMode('preset')
      setCategory(value)
    }
  }

  // Existing palette + any custom tags the user typed (so they're toggleable
  // and removable from the same place).
  const tagPalette = [
    ...existingTags,
    ...fields.tags.filter(
      (t) => !existingTags.includes(t) && !SPECIAL_TAGS.includes(t),
    ),
  ]

  const canSubmit = fields.title.trim() !== '' && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    const resolvedCategory =
      categoryMode === 'other' ? categoryOther.trim() || 'Autre' : category
    // 💎 / 🗝️ come exclusively from the toggles: strip any stale ones from the
    // free tags, then prepend so the Card's gold-ring case (first 3 tags) hits.
    const syncedTags = [
      ...(fields.pepite ? [PEPITE_TAG] : []),
      ...(fields.secret ? [SECRET_TAG] : []),
      ...fields.tags.filter((t) => !SPECIAL_TAGS.includes(t)),
    ]
    const input: UserActivityInput = {
      title: fields.title.trim(),
      tags: syncedTags,
      category: resolvedCategory,
      location: fields.location.trim(),
      transit: fields.transit.trim(),
      description: fields.description.trim(),
      duration: fields.duration.trim() || undefined,
      difficulty: difficultyIdx >= 0 ? DIFFICULTIES[difficultyIdx] : undefined,
      price: fields.price.trim(),
      rating: fields.rating,
      pepite: fields.pepite,
      secret: fields.secret,
      insolite: fields.insolite.trim() || undefined,
      coords: coords ?? undefined,
      photos: photos.map((p) => p.draft),
    }
    try {
      if (editingId) await onUpdate(editingId, input)
      else await onAdd(input)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  return {
    editingId,
    fields,
    setFields,
    categoryMode,
    category,
    categoryOther,
    setCategoryOther,
    onCategoryChange,
    difficultyIdx,
    setDifficultyIdx,
    photos,
    coords,
    setCoords,
    tagInput,
    setTagInput,
    urlInput,
    urlError,
    onUrlInputChange,
    saving,
    categories,
    tagPalette,
    canSubmit,
    resetForm,
    startEdit,
    addFiles,
    addUrlPhoto,
    removePhoto,
    addTag,
    toggleTag,
    submit,
  }
}
