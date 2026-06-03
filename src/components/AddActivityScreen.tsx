import { lazy, Suspense, useRef } from 'react'
import type { Activity } from '../types/activity.ts'
import type { StoredUserActivity } from '../types/userActivity.ts'
import type { UserActivityInput } from '../hooks/useUserActivities.ts'
import { YB } from '../utils/theme.ts'
import { Star, StarFilled } from '../icons/index.tsx'
import { useAddActivityForm, DIFFICULTIES } from '../hooks/useAddActivityForm.ts'
import { Field, FieldText, FieldArea, Chip, Toggle } from './AddActivityFields.tsx'
import { StoredActivityList } from './StoredActivityList.tsx'
import { CategoryPicker } from './CategoryPicker.tsx'
import { TagPickerPanel } from './TagPickerPanel.tsx'
import { PhotoPickerPanel } from './PhotoPickerPanel.tsx'

const LocationPicker = lazy(() =>
  import('./LocationPicker.tsx').then((m) => ({ default: m.LocationPicker })),
)

interface AddActivityScreenProps {
  /** Curated activities — source of the category / tag autocomplete palettes. */
  curatedActivities: Activity[]
  /** Runtime user activities (carry resolved `photoUrls`) — for list previews. */
  userActivities: Activity[]
  /** Persisted records — for pre-filling the edit form (raw fields + photoRefs). */
  stored: StoredUserActivity[]
  onAdd: (input: UserActivityInput) => Promise<void>
  onUpdate: (id: string, input: UserActivityInput) => Promise<void>
  /** Ask the parent to confirm + perform deletion (App-level ConfirmModal). */
  onRequestDelete: (id: string) => void
  /** Open the detail modal for a saved activity (preview + vote from here). */
  onPreview: (activity: Activity) => void
  /** True when this tab is visible — gates the (heavy) Leaflet map render. */
  active: boolean
}

export function AddActivityScreen({
  curatedActivities,
  userActivities,
  stored,
  onAdd,
  onUpdate,
  onRequestDelete,
  onPreview,
  active,
}: AddActivityScreenProps) {
  const f = useAddActivityForm({ curatedActivities, userActivities, onAdd, onUpdate })
  // The scroll container lives here; startEdit scrolls it back to the top.
  const scrollRef = useRef<HTMLDivElement>(null)

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
          {f.editingId ? 'Modifier l’activité' : 'Ajouter une activité'}
        </h1>
        <p className="font-sans" style={{ margin: '6px 0 22px', fontSize: 13.5, color: YB.ink2, lineHeight: 1.45 }}>
          {f.editingId
            ? 'Mets à jour les infos puis enregistre.'
            : 'Crée ta propre activité — elle rejoint ton deck.'}
        </p>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <FieldText
            label="Titre"
            required
            value={f.fields.title}
            onChange={(v) => f.setFields((s) => ({ ...s, title: v }))}
            placeholder="Ex. Coucher de soleil au Morne"
          />

          <CategoryPicker
            categories={f.categories}
            categoryMode={f.categoryMode}
            category={f.category}
            categoryOther={f.categoryOther}
            onCategoryChange={f.onCategoryChange}
            onCategoryOtherChange={f.setCategoryOther}
          />

          <FieldArea
            label="Description"
            value={f.fields.description}
            onChange={(v) => f.setFields((s) => ({ ...s, description: v }))}
            placeholder="Ce qu’on y fait, pourquoi c’est cool…"
          />

          <FieldText
            label="Lieu"
            value={f.fields.location}
            onChange={(v) => f.setFields((s) => ({ ...s, location: v }))}
            placeholder="Ex. Le Morne"
          />
          <FieldText
            label="Trajet depuis Tamarin"
            value={f.fields.transit}
            onChange={(v) => f.setFields((s) => ({ ...s, transit: v }))}
            placeholder="Ex. 25 min en voiture"
          />
          <FieldText
            label="Durée"
            value={f.fields.duration}
            onChange={(v) => f.setFields((s) => ({ ...s, duration: v }))}
            placeholder="Ex. 2 h"
          />
          <FieldText
            label="Prix"
            value={f.fields.price}
            onChange={(v) => f.setFields((s) => ({ ...s, price: v }))}
            placeholder="Ex. Gratuit · 1500 Rs"
          />

          <Field label="Difficulté">
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              <Chip
                selected={f.difficultyIdx === -1}
                onClick={() => f.setDifficultyIdx(-1)}
                label="Aucune"
              />
              {DIFFICULTIES.map((d, i) => (
                <Chip
                  key={d.label}
                  selected={f.difficultyIdx === i}
                  onClick={() => f.setDifficultyIdx(i)}
                  dot={d.dot}
                  label={d.label}
                />
              ))}
            </div>
          </Field>

          <Field label="Note">
            <div className="flex items-center" style={{ gap: 10 }}>
              {/* Stars sit on a white pill so solid-gold (selected) vs grey
                  (empty) reads clearly — gold-on-yellow was invisible. */}
              <div
                className="flex items-center"
                style={{
                  background: '#fff',
                  border: `1px solid ${YB.bgSoft}`,
                  borderRadius: 14,
                  padding: '4px 8px',
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = n <= f.fields.rating
                  return (
                    <button
                      key={n}
                      type="button"
                      // Tap = set to n (no toggle-off — that caused accidental
                      // clears on a re-tap). 44px hit area for reliable touch.
                      onClick={() => f.setFields((s) => ({ ...s, rating: n }))}
                      aria-label={`note ${n} sur 5`}
                      aria-pressed={on}
                      className="inline-flex items-center justify-center border-0 cursor-pointer"
                      style={{
                        background: 'transparent',
                        width: 48,
                        height: 48,
                        padding: 0,
                      }}
                    >
                      {/* pointer-events:none → the whole 48px button captures
                          the tap, not just the painted star shape. */}
                      {on ? (
                        <StarFilled
                          color={YB.top}
                          size={34}
                          style={{ pointerEvents: 'none' }}
                        />
                      ) : (
                        <Star
                          color="#C9C4BA"
                          size={34}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
              {f.fields.rating > 0 && (
                <>
                  <span
                    className="font-sans"
                    style={{ fontSize: 15, fontWeight: 800, color: YB.ink }}
                  >
                    {f.fields.rating}/5
                  </span>
                  <button
                    type="button"
                    onClick={() => f.setFields((s) => ({ ...s, rating: 0 }))}
                    aria-label="effacer la note"
                    className="font-sans cursor-pointer border-0"
                    style={{
                      background: 'transparent',
                      color: YB.muted,
                      fontSize: 13,
                      fontWeight: 700,
                      padding: 8,
                    }}
                  >
                    Effacer
                  </button>
                </>
              )}
            </div>
          </Field>

          <TagPickerPanel
            tagPalette={f.tagPalette}
            selectedTags={f.fields.tags}
            onToggleTag={f.toggleTag}
          />

          <PhotoPickerPanel
            photos={f.photos}
            urlInput={f.urlInput}
            urlError={f.urlError}
            onAddFiles={f.addFiles}
            onRemovePhoto={f.removePhoto}
            onUrlInputChange={f.onUrlInputChange}
            onAddUrlPhoto={f.addUrlPhoto}
          />

          <Field label="Position">
            {active ? (
              <Suspense
                fallback={<div style={{ height: 200, background: YB.bgSoft, borderRadius: 12 }} />}
              >
                <LocationPicker value={f.coords} onChange={f.setCoords} />
              </Suspense>
            ) : (
              <div style={{ height: 200, background: YB.bgSoft, borderRadius: 12 }} />
            )}
          </Field>

          <Field label="Anecdote (insolite)">
            <FieldArea
              value={f.fields.insolite}
              onChange={(v) => f.setFields((s) => ({ ...s, insolite: v }))}
              placeholder="Un détail surprenant…"
            />
          </Field>

          <div className="flex" style={{ gap: 16 }}>
            <Toggle
              label="💎 Pépite"
              on={f.fields.pepite}
              onToggle={() => f.setFields((s) => ({ ...s, pepite: !s.pepite }))}
            />
            <Toggle
              label="🗝️ Secret"
              on={f.fields.secret}
              onToggle={() => f.setFields((s) => ({ ...s, secret: !s.secret }))}
            />
          </div>

          <div className="flex" style={{ gap: 10, marginTop: 6 }}>
            {f.editingId && (
              <button
                type="button"
                onClick={f.resetForm}
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
              onClick={() => void f.submit()}
              disabled={!f.canSubmit}
              className="font-sans cursor-pointer border-0"
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 99,
                background: f.canSubmit ? YB.coral : 'rgba(20,30,50,0.12)',
                color: f.canSubmit ? '#fff' : YB.muted,
                fontWeight: 700,
                fontSize: 14,
                cursor: f.canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: f.canSubmit ? '0 6px 16px -4px rgba(255,107,71,0.4)' : 'none',
              }}
              aria-label={f.editingId ? 'enregistrer les modifications' : 'ajouter l’activité'}
            >
              {f.saving ? 'Enregistrement…' : f.editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>

          {f.submitError && (
            <p
              role="alert"
              className="font-sans"
              style={{ margin: '4px 2px 0', fontSize: 13, color: YB.coralDeep }}
            >
              {f.submitError}
            </p>
          )}
        </div>

        <StoredActivityList
          stored={stored}
          userActivities={userActivities}
          onPreview={onPreview}
          onEdit={(record) => {
            f.startEdit(record)
            scrollRef.current?.scrollTo({ top: 0 })
          }}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </div>
  )
}
