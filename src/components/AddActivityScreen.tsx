import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Activity, Difficulty } from '../types/activity.ts'
import type { PhotoRef, StoredUserActivity } from '../types/userActivity.ts'
import type { PhotoDraft, UserActivityInput } from '../hooks/useUserActivities.ts'
import { ACTIVITIES } from '../data/activities.ts'
import { YB } from '../utils/theme.ts'
import { Plus, X, StarFilled, Star } from '../icons/index.tsx'

const LocationPicker = lazy(() =>
  import('./LocationPicker.tsx').then((m) => ({ default: m.LocationPicker })),
)

interface AddActivityScreenProps {
  /** Runtime user activities (carry resolved `photoUrls`) — for list previews. */
  userActivities: Activity[]
  /** Persisted records — for pre-filling the edit form (raw fields + photoRefs). */
  stored: StoredUserActivity[]
  onAdd: (input: UserActivityInput) => Promise<void>
  onUpdate: (id: string, input: UserActivityInput) => Promise<void>
  /** Ask the parent to confirm + perform deletion (App-level ConfirmModal). */
  onRequestDelete: (id: string) => void
  /** True when this tab is visible — gates the (heavy) Leaflet map render. */
  active: boolean
}

const DIFFICULTIES: Difficulty[] = [
  { dot: '🟢', label: 'Facile' },
  { dot: '🟡', label: 'Modérée' },
  { dot: '🟠', label: 'Difficile' },
  { dot: '🔴', label: 'Très difficile' },
]

interface PhotoItem {
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

export function AddActivityScreen({
  userActivities,
  stored,
  onAdd,
  onUpdate,
  onRequestDelete,
  active,
}: AddActivityScreenProps) {
  const categories = useMemo(
    () => Array.from(new Set(ACTIVITIES.map((a) => a.category))),
    [],
  )
  // Every emoji tag used across the curated activities, offered as a palette.
  const existingTags = useMemo(
    () => Array.from(new Set(ACTIVITIES.flatMap((a) => a.tags))),
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
  const [saving, setSaving] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
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
    scrollRef.current?.scrollTo?.({ top: 0 })
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
    const ref: PhotoRef = { kind: 'url', url }
    setPhotos((p) => [...p, { draft: { kind: 'ref', ref }, preview: url, createdUrl: false }])
    setUrlInput('')
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

  // Existing palette + any custom tags the user typed (so they're toggleable
  // and removable from the same place).
  const tagPalette = [
    ...existingTags,
    ...fields.tags.filter((t) => !existingTags.includes(t)),
  ]

  const canSubmit = fields.title.trim() !== '' && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    const resolvedCategory =
      categoryMode === 'other' ? categoryOther.trim() || 'Autre' : category
    const input: UserActivityInput = {
      title: fields.title.trim(),
      tags: fields.tags,
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

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 z-[1] overflow-y-auto font-sans"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ padding: '0 22px' }}>
        <h1 className="m-0 font-sans" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          {editingId ? 'Modifier l’activité' : 'Ajouter une activité'}
        </h1>
        <p className="font-sans" style={{ margin: '6px 0 22px', fontSize: 13.5, color: YB.ink2, lineHeight: 1.45 }}>
          {editingId
            ? 'Mets à jour les infos puis enregistre.'
            : 'Crée ta propre activité — elle rejoint ton deck.'}
        </p>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <FieldText
            label="Titre"
            required
            value={fields.title}
            onChange={(v) => setFields((f) => ({ ...f, title: v }))}
            placeholder="Ex. Coucher de soleil au Morne"
          />

          <Field label="Catégorie">
            <select
              value={categoryMode === 'other' ? '__other__' : category}
              onChange={(e) => {
                if (e.target.value === '__other__') setCategoryMode('other')
                else {
                  setCategoryMode('preset')
                  setCategory(e.target.value)
                }
              }}
              aria-label="catégorie"
              style={selectStyle}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__other__">Autre…</option>
            </select>
            {categoryMode === 'other' && (
              <input
                type="text"
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                placeholder="Nom de la catégorie"
                aria-label="autre catégorie"
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </Field>

          <FieldArea
            label="Description"
            value={fields.description}
            onChange={(v) => setFields((f) => ({ ...f, description: v }))}
            placeholder="Ce qu’on y fait, pourquoi c’est cool…"
          />

          <FieldText
            label="Lieu"
            value={fields.location}
            onChange={(v) => setFields((f) => ({ ...f, location: v }))}
            placeholder="Ex. Le Morne"
          />
          <FieldText
            label="Trajet depuis Tamarin"
            value={fields.transit}
            onChange={(v) => setFields((f) => ({ ...f, transit: v }))}
            placeholder="Ex. 25 min en voiture"
          />
          <FieldText
            label="Durée"
            value={fields.duration}
            onChange={(v) => setFields((f) => ({ ...f, duration: v }))}
            placeholder="Ex. 2 h"
          />
          <FieldText
            label="Prix"
            value={fields.price}
            onChange={(v) => setFields((f) => ({ ...f, price: v }))}
            placeholder="Ex. Gratuit · 1500 Rs"
          />

          <Field label="Difficulté">
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              <Chip
                selected={difficultyIdx === -1}
                onClick={() => setDifficultyIdx(-1)}
                label="Aucune"
              />
              {DIFFICULTIES.map((d, i) => (
                <Chip
                  key={d.label}
                  selected={difficultyIdx === i}
                  onClick={() => setDifficultyIdx(i)}
                  dot={d.dot}
                  label={d.label}
                />
              ))}
            </div>
          </Field>

          <Field label="Note">
            <div className="flex items-center" style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= fields.rating
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setFields((f) => ({ ...f, rating: f.rating === n ? 0 : n }))
                    }
                    aria-label={`note ${n} sur 5`}
                    aria-pressed={on}
                    className="border-0 cursor-pointer"
                    style={{ background: 'transparent', padding: 2 }}
                  >
                    {on ? (
                      <StarFilled color={YB.top} size={26} />
                    ) : (
                      <Star color={YB.muted} size={26} />
                    )}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Tags (emojis)">
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginBottom: 10 }}>
              {tagPalette.map((tag) => {
                const on = fields.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                    aria-label={`tag ${tag}`}
                    className="inline-flex items-center justify-center cursor-pointer"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      fontSize: 19,
                      lineHeight: 1,
                      padding: 0,
                      background: on ? YB.coral : '#fff',
                      border: on ? '2px solid transparent' : `1px solid ${YB.bgSoft}`,
                      boxShadow: on ? '0 4px 10px -3px rgba(255,107,71,0.5)' : 'none',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Autre emoji, puis Entrée"
                aria-label="ajouter un tag personnalisé"
                style={{ ...inputStyle, flex: 1 }}
              />
              <SmallButton onClick={addTag} label="Ajouter" />
            </div>
          </Field>

          <Field label="Photos">
            {photos.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 72,
                        height: 90,
                        borderRadius: 10,
                        background: `url(${p.preview}) center/cover, ${YB.bgSoft}`,
                        border: i === 0 ? `2px solid ${YB.coral}` : '2px solid transparent',
                      }}
                      aria-label={i === 0 ? 'photo principale' : `photo ${i + 1}`}
                    />
                    {i === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          fontSize: 9,
                          fontWeight: 800,
                          color: '#fff',
                          background: YB.coral,
                          borderRadius: 6,
                          padding: '1px 4px',
                        }}
                      >
                        HERO
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`supprimer la photo ${i + 1}`}
                      className="inline-flex items-center justify-center border-0 cursor-pointer"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: 99,
                        background: YB.ink,
                        padding: 0,
                        boxShadow: '0 2px 6px -1px rgba(20,30,50,0.3)',
                      }}
                    >
                      <X color="#fff" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label
              className="inline-flex items-center font-sans cursor-pointer"
              style={{
                gap: 6,
                height: 60,
                background: '#fff',
                border: `1px solid ${YB.bgSoft}`,
                borderRadius: 14,
                padding: '0 18px',
                fontSize: 14,
                fontWeight: 700,
                color: YB.ink,
                marginBottom: 8,
              }}
            >
              <Plus color={YB.ink} size={16} />
              Galerie
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
                aria-label="ajouter des photos depuis la galerie"
                style={{ display: 'none' }}
              />
            </label>
            <div className="flex" style={{ gap: 8 }}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addUrlPhoto()
                  }
                }}
                placeholder="…ou coller une URL d’image"
                aria-label="coller une url d’image"
                style={{ ...inputStyle, flex: 1 }}
              />
              <SmallButton onClick={addUrlPhoto} label="Ajouter" />
            </div>
          </Field>

          <Field label="Position">
            {active ? (
              <Suspense
                fallback={<div style={{ height: 200, background: YB.bgSoft, borderRadius: 12 }} />}
              >
                <LocationPicker value={coords} onChange={setCoords} />
              </Suspense>
            ) : (
              <div style={{ height: 200, background: YB.bgSoft, borderRadius: 12 }} />
            )}
          </Field>

          <Field label="Anecdote (insolite)">
            <FieldArea
              value={fields.insolite}
              onChange={(v) => setFields((f) => ({ ...f, insolite: v }))}
              placeholder="Un détail surprenant…"
            />
          </Field>

          <div className="flex" style={{ gap: 16 }}>
            <Toggle
              label="💎 Pépite"
              on={fields.pepite}
              onToggle={() => setFields((f) => ({ ...f, pepite: !f.pepite }))}
            />
            <Toggle
              label="🗝️ Secret"
              on={fields.secret}
              onToggle={() => setFields((f) => ({ ...f, secret: !f.secret }))}
            />
          </div>

          <div className="flex" style={{ gap: 10, marginTop: 6 }}>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="font-sans cursor-pointer"
                style={{
                  flex: '0 0 auto',
                  padding: '13px 18px',
                  borderRadius: 99,
                  background: '#fff',
                  color: YB.ink,
                  fontWeight: 700,
                  fontSize: 14,
                  border: `1px solid ${YB.ink}`,
                }}
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="font-sans cursor-pointer border-0"
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 99,
                background: canSubmit ? YB.coral : 'rgba(20,30,50,0.12)',
                color: canSubmit ? '#fff' : YB.muted,
                fontWeight: 700,
                fontSize: 14,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 6px 16px -4px rgba(255,107,71,0.4)' : 'none',
              }}
              aria-label={editingId ? 'enregistrer les modifications' : 'ajouter l’activité'}
            >
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>

        {stored.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 className="m-0 font-sans" style={{ fontSize: 18, fontWeight: 800 }}>
              Mes activités ajoutées
            </h2>
            <div className="flex flex-col" style={{ gap: 6, marginTop: 12 }}>
              {stored.map((record) => {
                const runtime = userActivities.find((a) => a.id === record.id)
                const preview = runtime?.photoUrls?.[0] ?? '/photos/hero.jpg'
                return (
                  <div
                    key={record.id}
                    className="flex items-center font-sans"
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '8px 10px',
                      gap: 12,
                      boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
                    }}
                    data-testid={`user-activity-${record.id}`}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: `url(${preview}) center/cover, ${YB.bgSoft}`,
                      }}
                      aria-hidden
                    />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>
                      {record.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(record)}
                      className="font-sans cursor-pointer border-0"
                      style={{ background: 'transparent', color: YB.ink, fontSize: 13, fontWeight: 700, padding: 6 }}
                      aria-label={`modifier ${record.title}`}
                    >
                      Éditer
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(record.id)}
                      className="font-sans cursor-pointer border-0"
                      style={{ background: 'transparent', color: YB.coralDeep, fontSize: 13, fontWeight: 700, padding: 6 }}
                      aria-label={`supprimer ${record.title}`}
                    >
                      Suppr.
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  minWidth: 0,
  width: '100%',
  height: 60,
  borderRadius: 14,
  border: `1px solid ${YB.bgSoft}`,
  background: '#fff',
  // 16px keeps iOS Safari from auto-zooming the viewport on focus.
  padding: '0 16px',
  fontSize: 16,
  color: YB.ink,
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' }

function Field({ label, children, required }: { label?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col" style={{ gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: YB.ink2 }}>
          {label}
          {required && <span style={{ color: YB.coralDeep }}> *</span>}
        </span>
      )}
      {children}
    </label>
  )
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field label={label} required={required}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={inputStyle}
      />
    </Field>
  )
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        rows={3}
        style={{ ...inputStyle, height: 'auto', padding: '10px 12px', lineHeight: 1.4, resize: 'vertical' }}
      />
    </Field>
  )
}

function Chip({
  selected,
  onClick,
  label,
  dot,
}: {
  selected: boolean
  onClick: () => void
  label: string
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex items-center justify-center font-sans cursor-pointer"
      style={{
        minHeight: 40,
        gap: 6,
        padding: '0 14px',
        borderRadius: 99,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
        background: selected ? YB.ink : '#fff',
        color: selected ? '#fff' : YB.ink,
        border: selected ? '1px solid transparent' : `1px solid ${YB.bgSoft}`,
      }}
    >
      {dot && (
        <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
          {dot}
        </span>
      )}
      <span style={{ lineHeight: 1 }}>{label}</span>
    </button>
  )
}

function SmallButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans cursor-pointer border-0"
      style={{ height: 60, padding: '0 18px', borderRadius: 14, background: YB.ink, color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}
    >
      {label}
    </button>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="inline-flex items-center font-sans cursor-pointer"
      style={{
        gap: 8,
        padding: '8px 14px',
        borderRadius: 99,
        fontSize: 13.5,
        fontWeight: 700,
        background: on ? YB.ink : '#fff',
        color: on ? '#fff' : YB.ink,
        border: on ? '1px solid transparent' : `1px solid ${YB.bgSoft}`,
      }}
    >
      {label}
    </button>
  )
}
