import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { VERDICT_META, EXIT_MS, BUTTON_EXIT_MS, TOP_EXIT_MS, TAP_MAX_MS, TAP_MAX_DIST } from '../constants/swipe.ts'
import {
  dragVerdict,
  exitOffset,
  dragRotation,
  dragIntensity,
} from '../utils/swipe.ts'
import { Card } from './Card.tsx'
import { StampOverlay } from './StampOverlay.tsx'
import { HeartStamp } from './HeartStamp.tsx'
import { SuperLikeFX } from './SuperLikeFX.tsx'
import { Equal } from '../icons/index.tsx'

interface SwipeDeckProps {
  activities: Activity[]
  history: VoteEntry[]
  superRemaining: number
  /**
   * Fired when a verdict is committed (whether via gesture or button). When
   * the user attempts a super-like with no quota, the verdict reported here
   * is `'oui'` and `meta.quotaHit` is true.
   */
  onVerdict: (activity: Activity, verdict: Verdict, meta?: { quotaHit?: boolean }) => void
  /** Fired once when the deck is exhausted. */
  onComplete?: () => void
  /** Fired when the user taps (not drags) the active card. */
  onOpenDetail?: (activity: Activity) => void
  /**
   * When true, the deck restarts from index 0 (regardless of history),
   * shows the previous vote as a banner on each card, and the action-row
   * "=" path (via `commit(prevVerdict)`) keeps the vote unchanged. Used by
   * the "Revoir mes votes" flow.
   */
  reviewMode?: boolean
}

export interface SwipeDeckHandle {
  /** Programmatically commit a verdict (used by buttons / detail modal). */
  commit: (verdict: Verdict) => void
  /** Returns the activity currently on top of the deck, or null when
      the deck is exhausted. Used by the ActionRow eye button so it
      opens the right card in both normal and review modes. */
  getCurrent: () => Activity | null
}

interface ExitingState {
  card: Activity
  verdict: Verdict
  fromX: number
  fromY: number
  fromR: number
  fromButton: boolean
}

/**
 * Stacked deck of cards with full pointer-gesture support. Up to 3 cards are
 * mounted at once (active + 2 peeking behind) so the next card grows into
 * place smoothly via CSS transitions while the exiting card flies off as a
 * separate keyframe-animated layer.
 *
 * The stack key is the activity id, kept stable across the topIdx advance so
 * the "next peek" → "active" transition is interpolated by CSS, not
 * re-mounted (avoids the boomerang flash).
 */
export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeck(
    { activities, history, superRemaining, onVerdict, onComplete, onOpenDetail, reviewMode = false },
    ref,
  ) {
    // In normal mode topIdx mirrors history.length so undo realigns the
    // stack. In review mode the deck restarts from 0 and the user walks
    // through every activity, including ones already voted on.
    //
    // We sync via the React 19 "setState during render" pattern — see
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    // — so the deck snaps to the right starting point exactly when the
    // mode or the history length changes upstream.
    const [topIdx, setTopIdx] = useState(reviewMode ? 0 : history.length)
    const [snapshot, setSnapshot] = useState({
      reviewMode,
      historyLen: history.length,
    })
    if (snapshot.reviewMode !== reviewMode) {
      setTopIdx(reviewMode ? 0 : history.length)
      setSnapshot({ reviewMode, historyLen: history.length })
    } else if (!reviewMode && snapshot.historyLen !== history.length) {
      // Normal mode: undo/redo from the parent shortens or extends
      // history; keep the visible top card in lockstep.
      setTopIdx(history.length)
      setSnapshot({ reviewMode, historyLen: history.length })
    }

    // Quick lookup of "what verdict did this activity get?" (latest entry
    // wins if the user somehow has multiple entries for the same id).
    const previousVerdictById = useMemo(() => {
      const m = new Map<string, Verdict>()
      for (const e of history) m.set(e.id, e.verdict)
      return m
    }, [history])

    const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false })
    const [exiting, setExiting] = useState<ExitingState | null>(null)

    const startRef = useRef<{ x: number; y: number } | null>(null)
    const tapRef = useRef<{ time: number; x: number; y: number } | null>(null)

    const stack: Activity[] = []
    for (let i = 0; i < 3; i++) {
      const a = activities[topIdx + i]
      if (a) stack.push(a)
    }
    const current = stack[0]

    const verdict = drag.dragging ? dragVerdict(drag.x, drag.y) : null
    const rotate = drag.dragging ? dragRotation(drag.x) : 0
    const intensity = verdict ? dragIntensity(drag.x, drag.y) : 0

    const commit = useCallback(
      (v: Verdict) => {
        if (exiting || !current) return
        const isQuotaHit = v === 'top' && superRemaining <= 0
        const reportedVerdict: Verdict = isQuotaHit ? 'oui' : v
        onVerdict(current, reportedVerdict, isQuotaHit ? { quotaHit: true } : undefined)
        setExiting({
          card: current,
          verdict: v, // visual exit follows the user's intent, not the converted result
          fromX: drag.x,
          fromY: drag.y,
          fromR: rotate,
          fromButton: drag.x === 0 && drag.y === 0,
        })
        setTopIdx((i) => i + 1)
        setDrag({ x: 0, y: 0, dragging: false })
        const dur =
          v === 'top'
            ? TOP_EXIT_MS
            : drag.x === 0 && drag.y === 0
              ? BUTTON_EXIT_MS
              : EXIT_MS
        window.setTimeout(() => {
          setExiting(null)
          if (topIdx + 1 >= activities.length) onComplete?.()
        }, dur)
      },
      [exiting, current, onVerdict, onComplete, superRemaining, drag.x, drag.y, rotate, topIdx, activities.length],
    )

    useImperativeHandle(
      ref,
      () => ({ commit, getCurrent: () => current ?? null }),
      [commit, current],
    )

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (exiting || !current) return
      e.currentTarget.setPointerCapture(e.pointerId)
      startRef.current = { x: e.clientX, y: e.clientY }
      tapRef.current = { time: Date.now(), x: e.clientX, y: e.clientY }
      setDrag({ x: 0, y: 0, dragging: true })
    }

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag.dragging || !startRef.current) return
      setDrag({
        x: e.clientX - startRef.current.x,
        y: e.clientY - startRef.current.y,
        dragging: true,
      })
    }

    const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag.dragging) return
      const v = dragVerdict(drag.x, drag.y)
      if (v) {
        commit(v)
      } else {
        const t = tapRef.current
        const dt = t ? Date.now() - t.time : Infinity
        const dist = t ? Math.hypot(e.clientX - t.x, e.clientY - t.y) : Infinity
        if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST && current && onOpenDetail) {
          onOpenDetail(current)
        }
        setDrag({ x: 0, y: 0, dragging: false })
      }
      startRef.current = null
      tapRef.current = null
    }

    if (!current && !exiting) return null

    const exitOff = exiting ? exitOffset(exiting.verdict) : null
    const exitDur = exiting?.verdict === 'top'
      ? TOP_EXIT_MS
      : exiting?.fromButton
        ? BUTTON_EXIT_MS
        : EXIT_MS

    return (
      <>
        {/* Subtle full-frame tint while dragging */}
        {verdict && (
          <div
            className="pointer-events-none absolute"
            style={{
              inset: -40,
              background: VERDICT_META[verdict].color,
              opacity: intensity * 0.16,
              transition: drag.dragging ? 'none' : 'opacity 0.2s',
              zIndex: 0,
            }}
          />
        )}

        {/* The stack — keyed by activity id for stable transitions */}
        {stack.map((a, i) => {
          const isActive = i === 0
          const cardTransform = isActive
            ? `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`
            : `scale(${1 - i * 0.05}) translateY(${i * 14}px)`
          // The previous vote to surface as a review banner on the active card
          // — null unless we're in review mode, on the active card, a vote
          // exists for it, and no exit is in flight. `null` cleanly gates the
          // banner below without a redundant second truthiness check.
          const bannerVerdict =
            isActive && reviewMode && !exiting
              ? (previousVerdictById.get(a.id) ?? null)
              : null
          return (
            <div
              key={a.id}
              data-testid={isActive ? 'active-card' : undefined}
              onPointerDown={isActive ? onPointerDown : undefined}
              onPointerMove={isActive ? onPointerMove : undefined}
              onPointerUp={isActive ? onPointerUp : undefined}
              onPointerCancel={isActive ? onPointerUp : undefined}
              className="absolute select-none"
              style={{
                inset: 0,
                transform: cardTransform,
                transformOrigin: 'center bottom',
                transition: drag.dragging
                  ? 'none'
                  : 'transform 0.4s cubic-bezier(.2,.7,.3,1), opacity 0.4s',
                opacity: isActive ? 1 : Math.max(0.35, 1 - i * 0.4),
                zIndex: 3 - i,
                cursor: isActive ? (drag.dragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'none',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <Card activity={a} />
              {bannerVerdict && (
                <PreviousVoteBanner
                  verdict={bannerVerdict}
                  onConfirm={() => commit(bannerVerdict)}
                />
              )}
            </div>
          )
        })}

        {/* The exiting card, animated from its release position to off-screen */}
        {exiting && exitOff && (
          <div
            key={`exit-${exiting.card.id}`}
            className="pointer-events-none absolute"
            style={
              {
                inset: 0,
                '--fx': `${exiting.fromX}px`,
                '--fy': `${exiting.fromY}px`,
                '--fr': `${exiting.fromR}deg`,
                '--tx': `${exitOff.x}px`,
                '--ty': `${exitOff.y}px`,
                '--tr': `${exitOff.r}deg`,
                transformOrigin: 'center bottom',
                animation: `yallahDeckExit ${exitDur}ms cubic-bezier(.4,.0,.6,.95) forwards`,
                zIndex: 10,
                filter:
                  exiting.verdict === 'top'
                    ? 'drop-shadow(0 0 28px rgba(239,191,4,0.75))'
                    : 'none',
              } as React.CSSProperties
            }
          >
            <Card activity={exiting.card} />
            {exiting.verdict === 'oui' && <HeartStamp intensity={1} />}
            {(exiting.verdict === 'non' || exiting.verdict === 'whynot') && (
              <StampOverlay verdict={exiting.verdict} intensity={1} />
            )}
          </div>
        )}

        {/* Drag stamps — centred at deck while dragging only. */}
        {verdict === 'oui' && <HeartStamp intensity={intensity} />}
        {(verdict === 'non' || verdict === 'whynot') && (
          <StampOverlay verdict={verdict} intensity={intensity} />
        )}

        {/* Super-like FX overlay during exit */}
        {exiting?.verdict === 'top' && <SuperLikeFX />}
      </>
    )
  },
)

interface PreviousVoteBannerProps {
  verdict: Verdict
  onConfirm: () => void
}

/**
 * Floating pill on the active card that surfaces the previous vote and
 * offers an "=" button to keep it. Used in review-mode passes.
 *
 * Renders ABOVE the card photo and stops pointer events from bubbling so
 * tapping the pill doesn't trigger a tap-to-detail or start a drag.
 */
function PreviousVoteBanner({ verdict, onConfirm }: PreviousVoteBannerProps) {
  const meta = VERDICT_META[verdict]
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-[6] inline-flex items-center font-sans"
      style={{
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        borderRadius: 99,
        padding: '4px 4px 4px 14px',
        gap: 10,
        boxShadow: '0 4px 12px -2px rgba(20,30,50,0.2)',
        fontSize: 12,
        fontWeight: 700,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
      role="region"
      aria-label={`Tu as voté ${meta.label} sur cette activité`}
    >
      <span aria-hidden style={{ fontSize: 13 }}>{meta.emoji}</span>
      <span>{meta.label}</span>
      <button
        type="button"
        onClick={onConfirm}
        aria-label="Garder la même réponse"
        className="flex items-center justify-center border-0 cursor-pointer"
        style={{
          width: 30,
          height: 30,
          borderRadius: 99,
          background: meta.color,
          color: '#fff',
          padding: 0,
        }}
      >
        <Equal color="#fff" size={18} />
      </button>
    </div>
  )
}

