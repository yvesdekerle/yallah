import { useState } from 'react'
import { YB } from '../utils/theme.ts'
import { labelForTag } from '../utils/tags.ts'
import { ModalShell } from './ModalShell.tsx'

interface TagFilterSheetProps {
  /** All tags present in the deck, in display order. */
  tags: string[]
  /** Number of activities carrying each tag (shown as a chip badge). */
  tagCounts: Record<string, number>
  /** Currently applied filter (emoji tags). */
  selected: string[]
  /** Called with the new selection when the user confirms. */
  onApply: (tags: string[]) => void
  /** Dismiss without applying (backdrop tap / ✕ / Escape). */
  onClose: () => void
}

/**
 * Bottom-sheet for filtering the swipe deck by category (emoji tag).
 *
 * The selection is a *draft* held locally: tapping a chip toggles it, the
 * "Confirmer" button commits it to the parent, and dismissing discards it.
 * Multi-select with OR semantics — confirming an empty draft clears the
 * filter (shows everything).
 */
export function TagFilterSheet({
  tags,
  tagCounts,
  selected,
  onApply,
  onClose,
}: TagFilterSheetProps) {
  const [draft, setDraft] = useState<string[]>(selected)

  const toggle = (tag: string) =>
    setDraft((d) =>
      d.includes(tag) ? d.filter((t) => t !== tag) : [...d, tag],
    )
  const selectAll = () => setDraft(tags)
  const clearAll = () => setDraft([])

  return (
    <ModalShell
      ariaLabel="Filtrer par catégorie"
      onClose={onClose}
      align="end"
      testId="filter-backdrop"
      panelClassName="w-full"
      panelStyle={{
        background: YB.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: '20px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)',
        boxShadow: '0 -10px 30px -10px rgba(20,30,50,0.35)',
        maxHeight: '85%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
        <div
          className="flex items-center"
          style={{ justifyContent: 'space-between', marginBottom: 4 }}
        >
          <h2
            className="m-0 font-sans"
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: -0.3,
              color: YB.ink,
            }}
          >
            Filtrer par catégorie
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="fermer le filtre"
            className="font-sans cursor-pointer border-0"
            style={{
              background: 'transparent',
              color: YB.muted,
              fontSize: 22,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <p
          className="font-sans"
          style={{
            margin: '0 0 14px',
            fontSize: 13.5,
            color: YB.ink2,
            lineHeight: 1.45,
          }}
        >
          Choisis une ou plusieurs catégories. Seules les activités
          correspondantes s'afficheront dans le deck.
        </p>

        <div className="flex" style={{ gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            onClick={selectAll}
            className="font-sans cursor-pointer"
            style={selectorBtn}
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="font-sans cursor-pointer"
            style={selectorBtn}
          >
            Tout désélectionner
          </button>
        </div>

        <div
          className="flex flex-wrap"
          style={{ gap: 8, overflowY: 'auto', paddingBottom: 4 }}
        >
          {tags.map((tag) => {
            const on = draft.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                aria-pressed={on}
                data-testid={`filter-chip-${tag}`}
                className="inline-flex items-center font-sans cursor-pointer"
                style={{
                  gap: 7,
                  padding: '8px 12px',
                  borderRadius: 99,
                  border: `1.5px solid ${on ? YB.coral : 'rgba(20,30,50,0.12)'}`,
                  background: on ? YB.coral : '#fff',
                  color: on ? '#fff' : YB.ink,
                  fontSize: 13.5,
                  fontWeight: 600,
                  letterSpacing: -0.1,
                }}
              >
                <span aria-hidden style={{ fontSize: 15 }}>
                  {tag}
                </span>
                <span>{labelForTag(tag)}</span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  {tagCounts[tag] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onApply(draft)
            onClose()
          }}
          data-testid="filter-confirm"
          className="font-sans cursor-pointer border-0 w-full"
          style={{
            marginTop: 16,
            padding: '14px 16px',
            borderRadius: 14,
            background: YB.ink,
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 0.2,
            flexShrink: 0,
          }}
        >
          {draft.length === 0
            ? 'Confirmer · tout afficher'
            : `Confirmer · ${draft.length} catégorie${draft.length > 1 ? 's' : ''}`}
        </button>
    </ModalShell>
  )
}

const selectorBtn: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(20,30,50,0.12)',
  background: YB.bgSoft,
  color: YB.ink2,
  fontSize: 12.5,
  fontWeight: 700,
}
