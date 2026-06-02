import type { RefObject } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { UndoButton } from './UndoButton.tsx'
import { ActionRow } from './ActionRow.tsx'
import { ReviewPrompt } from './ReviewPrompt.tsx'
import { SwipeDeck, type SwipeDeckHandle } from './SwipeDeck.tsx'

interface SwipeScreenProps {
  /** Ref forwarded to the underlying deck — owned by App for imperative commits. */
  deckRef: RefObject<SwipeDeckHandle | null>
  /** Activities served to the deck (already tag-filtered upstream when applicable). */
  deckActivities: Activity[]
  history: VoteEntry[]
  superRemaining: number
  /** Raw review-mode flag — drives the "Mode révision" exit pill. */
  reviewMode: boolean
  /** True once every activity is voted — gates the deck behind the ReviewPrompt. */
  done: boolean
  /** True when the active tag filter leaves no unvoted activity to show. */
  filteredEmpty: boolean
  /** Number of active tag filters (badge on the funnel button). */
  activeFilterCount: number
  /** Whether the detail modal is open (eye-toggle icon state). */
  detailOpen: boolean
  onVerdict: (
    activity: Activity,
    verdict: Verdict,
    meta?: { quotaHit?: boolean },
  ) => void
  onUndo: () => void
  onExitReview: () => void
  onAction: (verdict: Verdict) => void
  onReview: () => void
  onComplete: () => void
  onOpenFilter: () => void
  onOpenDetail: (activity: Activity) => void
  onToggleDetail: () => void
}

/**
 * The Swipe tab: undo button, optional review-mode exit pill, the swipe deck
 * (with an empty-filter fallback), and either the action row or the
 * end-of-deck "Revoir les votes ?" prompt.
 *
 * Presentational by design — all state lives in `App` and reaches here as
 * props/callbacks, so the screen's wiring is testable in isolation. The deck
 * is gated behind `reviewMode || done` so a finished deck stays on screen (in
 * review layout) instead of going blank.
 */
export function SwipeScreen({
  deckRef,
  deckActivities,
  history,
  superRemaining,
  reviewMode,
  done,
  filteredEmpty,
  activeFilterCount,
  detailOpen,
  onVerdict,
  onUndo,
  onExitReview,
  onAction,
  onReview,
  onComplete,
  onOpenFilter,
  onOpenDetail,
  onToggleDetail,
}: SwipeScreenProps) {
  return (
    <>
      <UndoButton enabled={history.length > 0 && !done} onClick={onUndo} />
      {reviewMode && (
        <button
          type="button"
          onClick={onExitReview}
          aria-label="quitter le mode révision"
          className="absolute z-[9] inline-flex items-center font-sans cursor-pointer border-0"
          style={{
            top: 46,
            right: 18,
            height: 36,
            padding: '0 12px 0 14px',
            borderRadius: 99,
            background: YB.coral,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.2,
            gap: 8,
            boxShadow: '0 4px 12px -2px rgba(255,107,71,0.35)',
          }}
        >
          <span>Mode révision</span>
          <span
            aria-hidden
            style={{ fontSize: 16, lineHeight: 1, opacity: 0.9 }}
          >
            ✕
          </span>
        </button>
      )}
      <div
        className="phone-card-area absolute"
        style={{
          top: 76,
          left: 10,
          right: 10,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Trap SwipeDeck's internal z-indices (exiting card z 10, drag
          // stamps z 9) inside this stacking context so they can't paint over
          // the ActionRow (z 7) sitting outside.
          isolation: 'isolate',
        }}
      >
        {/* When everything's voted we keep the cards on screen (in review
            layout) and gate them behind the "Revoir les votes ?" prompt
            instead of an empty screen. */}
        <SwipeDeck
          ref={deckRef}
          activities={deckActivities}
          history={history}
          superRemaining={superRemaining}
          reviewMode={reviewMode || done}
          onVerdict={onVerdict}
          onComplete={onComplete}
          onOpenDetail={onOpenDetail}
        />
        {filteredEmpty && (
          <div
            className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center font-sans"
            style={{ padding: '0 32px', gap: 14 }}
          >
            <span aria-hidden style={{ fontSize: 40 }}>
              🔍
            </span>
            <p
              className="m-0"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: YB.ink,
                lineHeight: 1.4,
              }}
            >
              Aucune activité à voter pour ces catégories.
            </p>
            <button
              type="button"
              onClick={onOpenFilter}
              className="font-sans cursor-pointer border-0"
              style={{
                padding: '10px 18px',
                borderRadius: 99,
                background: YB.coral,
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              Modifier les filtres
            </button>
          </div>
        )}
      </div>
      {!done && (
        <ActionRow
          onAct={onAction}
          superRemaining={superRemaining}
          onOpenFilter={onOpenFilter}
          activeFilterCount={activeFilterCount}
          onToggleDetail={onToggleDetail}
          detailOpen={detailOpen}
        />
      )}
      {done && <ReviewPrompt onConfirm={onReview} />}
    </>
  )
}
