import { useCallback, useMemo, useState } from 'react'
import type { Activity, Difficulty } from '../types/activity.ts'
import type { StoredUserActivity } from '../types/userActivity.ts'
import type { UserActivityInput } from './useUserActivities.ts'
import { usePhotoLifecycle } from './usePhotoLifecycle.ts'

// Re-exported so consumers (PhotoPickerPanel) keep a single import surface.
export type { PhotoItem } from './usePhotoLifecycle.ts'

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
  /** Curated activities — the source of the category / tag suggestion palettes. */
  curatedActivities: Activity[]
  userActivities: Activity[]
  onAdd: (input: UserActivityInput) => Promise<void>
  onUpdate: (id: string, input: UserActivityInput) => Promise<void>
}

/**
 * Owns the add/edit-activity form's fields, category/tag palettes, edit-record
 * hydration and submit. The picked-file photo lifecycle (object-URL creation +
 * revocation, paste-URL validation) is delegated to {@link usePhotoLifecycle}
 * (ARCH-04), keeping this hook a thin orchestrator.
 */
export function useAddActivityForm({
  curatedActivities,
  userActivities,
  onAdd,
  onUpdate,
}: UseAddActivityFormArgs) {
  const categories = useMemo(
    () => Array.from(new Set(curatedActivities.map((a) => a.category))),
    [curatedActivities],
  )
  // Every emoji tag used across the curated activities, offered as a palette
  // (minus 💎 / 🗝️, which the Pépite / Secret toggles own).
  const existingTags = useMemo(
    () =>
      Array.from(new Set(curatedActivities.flatMap((a) => a.tags))).filter(
        (t) => !SPECIAL_TAGS.includes(t),
      ),
    [curatedActivities],
  )

  const [editingId, setEditingId] = useState<string | null>(null)
  const [fields, setFields] = useState({ ...EMPTY })
  const [categoryMode, setCategoryMode] = useState<'preset' | 'other'>('preset')
  const [category, setCategory] = useState(categories[0] ?? '')
  const [categoryOther, setCategoryOther] = useState('')
  const [difficultyIdx, setDifficultyIdx] = useState(-1)
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  const photo = usePhotoLifecycle()

  const resetForm = () => {
    photo.reset()
    setEditingId(null)
    setFields({ ...EMPTY })
    setCategoryMode('preset')
    setCategory(categories[0] ?? '')
    setCategoryOther('')
    setDifficultyIdx(-1)
    setCoords(null)
    setSubmitError('')
  }

  const startEdit = (record: StoredUserActivity) => {
    const runtime = userActivities.find((a) => a.id === record.id)
    const urls = runtime?.photoUrls ?? []
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
    photo.hydrate(record.photoRefs, urls)
    setCoords(record.coords ?? null)
  }

  // Stable identity so the memoized TagPickerPanel doesn't re-render on every
  // keystroke in the other fields.
  const toggleTag = useCallback(
    (tag: string) =>
      setFields((f) => ({
        ...f,
        tags: f.tags.includes(tag)
          ? f.tags.filter((t) => t !== tag)
          : [...f.tags, tag],
      })),
    [],
  )

  // The <select> emits the preset value or the `__other__` sentinel.
  const onCategoryChange = (value: string) => {
    if (value === '__other__') setCategoryMode('other')
    else {
      setCategoryMode('preset')
      setCategory(value)
    }
  }

  // Existing palette + any custom tags the user typed (so they're toggleable
  // and removable from the same place). Memoized so it keeps a stable identity
  // across unrelated field edits (feeds the memoized TagPickerPanel).
  const tagPalette = useMemo(
    () => [
      ...existingTags,
      ...fields.tags.filter(
        (t) => !existingTags.includes(t) && !SPECIAL_TAGS.includes(t),
      ),
    ],
    [existingTags, fields.tags],
  )

  const canSubmit = fields.title.trim() !== '' && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setSubmitError('')
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
      photos: photo.photos.map((p) => p.draft),
    }
    try {
      if (editingId) await onUpdate(editingId, input)
      else await onAdd(input)
      resetForm()
    } catch {
      // Most likely a photo that couldn't be decoded/resized (e.g. an HEIC
      // file on a browser without HEIC support). Keep the form so the user
      // can retry or remove the offending photo, and tell them why.
      setSubmitError(
        'Échec de l’enregistrement — une photo n’a peut-être pas pu être traitée. Réessaie ou retire-la.',
      )
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
    photos: photo.photos,
    coords,
    setCoords,
    urlInput: photo.urlInput,
    urlError: photo.urlError,
    onUrlInputChange: photo.onUrlInputChange,
    submitError,
    saving,
    categories,
    tagPalette,
    canSubmit,
    resetForm,
    startEdit,
    addFiles: photo.addFiles,
    addUrlPhoto: photo.addUrlPhoto,
    removePhoto: photo.removePhoto,
    toggleTag,
    submit,
  }
}
