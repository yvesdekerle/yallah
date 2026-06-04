import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { useModalA11y } from '../hooks/useModalA11y.ts'
import { detailPhotos } from '../utils/photos.ts'
import { ActionRow } from './ActionRow.tsx'
import { PhotoLightbox } from './PhotoLightbox.tsx'
import { DetailHero } from './DetailHero.tsx'
import { DetailMetaTiles } from './DetailMetaTiles.tsx'
import { DetailBody } from './DetailBody.tsx'
import { DetailMap } from './DetailMap.tsx'
import { DetailGroupVotes } from './DetailGroupVotes.tsx'
import type { MapView } from '../types/map.ts'

interface DetailModalProps {
  activity: Activity
  /** Called when the modal should close (overlay click, X button, eye toggle). */
  onClose: () => void
  /** Called with a verdict from the sticky bottom action row. */
  onVerdict: (verdict: Verdict) => void
  superRemaining: number
  /** Open the FullscreenMap. Optional — when undefined, the mini-map
      is not tappable (still shown, just inert). */
  onOpenMap?: (view: MapView) => void
  /** True once the local user has voted on every activity. Gates the
      "Le groupe" votes panel — placeholder before, reveal after. */
  meDone?: boolean
  /** Id of the local user — used to slot the real verdict in the group panel. */
  userId?: string | null
  /** Active identity id (Google uid or demo id) — flags "créé par toi". */
  currentUserId?: string | null
  /** Local user's verdict for this activity, if any. */
  myVerdict?: Verdict | null
}

/**
 * Slide-up bottom-sheet detail view for a single activity. This shell owns the
 * open/close animation, the backdrop ghost-click guard, the photo lightbox and
 * the sticky action row, and composes the content sections:
 * DetailHero · DetailMetaTiles · DetailBody · DetailMap · DetailGroupVotes.
 */
export function DetailModal({
  activity,
  onClose,
  onVerdict,
  superRemaining,
  onOpenMap,
  meDone = false,
  userId = null,
  currentUserId = null,
  myVerdict = null,
}: DetailModalProps) {
  const [open, setOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  // Stable identity so the memoized PhotoLightbox isn't re-rendered by the
  // sheet's open/armed state churn.
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])

  const photos = useMemo(() => detailPhotos(activity), [activity])

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true))
  }, [])

  // The active swipe card opens this modal on `pointerup` (tap-vs-drag is
  // decided there). On touch, a synthesized `click` follows the pointer
  // sequence and lands on this just-mounted backdrop — closing the modal
  // the instant it opens. Ignore backdrop clicks for a short window after
  // mount so that opening-tap echo can't dismiss it. (The X button is not
  // guarded — it's an explicit, deliberate action.)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  const close = () => {
    setOpen(false)
    window.setTimeout(onClose, 250)
  }

  // Esc-to-close (running the slide-out), focus trap + restoration. Scoped to
  // the sheet so when a lightbox/map is layered above, Esc dismisses that first.
  const sheetRef = useRef<HTMLDivElement>(null)
  useModalA11y(sheetRef, { onClose: close })

  const closeFromBackdrop = () => {
    if (!armed) return
    close()
  }

  const handleAction = (v: Verdict) => {
    onVerdict(v)
    close()
  }

  return (
    <div
      onClick={closeFromBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Détail de ${activity.title}`}
      className="absolute inset-0 z-sheet"
      style={{
        background: open ? 'rgba(20,25,40,0.5)' : 'rgba(20,25,40,0)',
        transition: 'background 0.25s',
      }}
    >
      {/* Inner slide-up sheet panel. The outer element is the labelled dialog
          (aria-modal + aria-label); this panel has no natural ARIA role of its
          own, so tests keep a data-testid to scope within(sheet) queries. */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-testid="detail-sheet"
        className="absolute left-0 right-0 bottom-0 overflow-y-auto font-sans outline-none"
        style={{
          top: open ? 0 : '100%',
          background: YB.paper,
          transition: 'top 0.35s cubic-bezier(.2,.7,.3,1)',
          color: YB.ink,
        }}
      >
        <DetailHero
          activity={activity}
          heroPhoto={photos[0] ?? '/photos/hero.jpg'}
          onClose={close}
        />

        {/* Body */}
        <div style={{ padding: '22px 22px 200px' }}>
          <DetailMetaTiles activity={activity} />
          <DetailBody
            activity={activity}
            photos={photos}
            onOpenPhoto={setLightboxIdx}
            createdByMe={
              activity.createdBy != null &&
              activity.createdBy.uid === currentUserId
            }
          />
          <DetailMap activity={activity} onOpenMap={onOpenMap} />
          <DetailGroupVotes
            activity={activity}
            meDone={meDone}
            userId={userId}
            myVerdict={myVerdict}
          />
        </div>

        {/* Sticky bottom action bar */}
        <div
          className="sticky bottom-0 left-0 right-0"
          style={{
            background: 'rgba(255,252,245,0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(20,30,50,0.08)',
            padding: '14px 12px',
          }}
        >
          <ActionRow
            onAct={handleAction}
            superRemaining={superRemaining}
            onToggleDetail={close}
            detailOpen
            absolute={false}
          />
        </div>
      </div>

      {lightboxIdx != null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={closeLightbox}
        />
      )}
    </div>
  )
}
