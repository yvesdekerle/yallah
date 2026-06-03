import { forwardRef, useImperativeHandle, useState } from 'react'
import { VERDICT_META } from '../constants/swipe.ts'
import { dragVerdict, dragIntensity } from '../utils/swipe.ts'
import { HeartStamp } from './HeartStamp.tsx'
import { StampOverlay } from './StampOverlay.tsx'

export interface DragFeedbackHandle {
  /** Push the live drag offset — called at most once per animation frame. */
  update: (x: number, y: number) => void
  /** Clear the feedback when the drag ends. */
  clear: () => void
}

interface DragState {
  x: number
  y: number
  active: boolean
}

/**
 * Live swipe feedback — the full-frame verdict tint plus the centred verdict
 * stamp (heart for `oui`, rubber stamp for `non`/`whynot`). Isolated into its
 * own component with an imperative handle so the high-frequency drag updates
 * re-render only this tiny subtree, never the photo-heavy card stack. The card
 * transform itself is written straight to the DOM by `useSwipeGesture`; this is
 * the cheap visual layer that rides alongside it.
 */
export const DragFeedback = forwardRef<DragFeedbackHandle>(
  function DragFeedback(_props, ref) {
    const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, active: false })

    useImperativeHandle(
      ref,
      () => ({
        update: (x, y) => setDrag({ x, y, active: true }),
        clear: () =>
          setDrag((d) => (d.active ? { x: 0, y: 0, active: false } : d)),
      }),
      [],
    )

    const verdict = drag.active ? dragVerdict(drag.x, drag.y) : null
    const intensity = verdict ? dragIntensity(drag.x, drag.y) : 0
    if (!verdict) return null

    return (
      <>
        {/* Subtle full-frame tint while dragging */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: -40,
            background: VERDICT_META[verdict].color,
            opacity: intensity * 0.16,
            zIndex: 0,
          }}
        />
        {/* Centred verdict stamp */}
        {verdict === 'oui' && <HeartStamp intensity={intensity} />}
        {(verdict === 'non' || verdict === 'whynot') && (
          <StampOverlay verdict={verdict} intensity={intensity} />
        )}
      </>
    )
  },
)
