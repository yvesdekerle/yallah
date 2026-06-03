import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { Verdict } from '../types/verdict.ts'
import { dragVerdict, dragRotation } from '../utils/swipe.ts'
import { TAP_MAX_MS, TAP_MAX_DIST } from '../constants/swipe.ts'

interface UseSwipeGestureArgs {
  /** Ignore gestures (e.g. while a card exits or the deck is empty). */
  disabled: boolean
  /** A drag past the verdict threshold; `from` is the release offset (for the
      exit animation). */
  onSwipe: (verdict: Verdict, from: { x: number; y: number }) => void
  /** A tap (fast, small movement) rather than a swipe. */
  onTap: () => void
  /** The active card wrapper. The rAF writes the live drag transform straight
      onto this node — never through React — so the photo-heavy card doesn't
      re-render on every `pointermove` (PERF: kills the drag stutter). */
  cardRef: RefObject<HTMLDivElement | null>
  /** Live drag offset, pushed at most once per animation frame, for the
      lightweight verdict feedback (tint + stamps). */
  onDragMove?: (x: number, y: number) => void
  /** The drag ended (released or cancelled): clear the feedback. */
  onDragEnd?: () => void
}

type PointerHandler = (e: ReactPointerEvent<HTMLDivElement>) => void

export interface SwipeGesture {
  /** Spread onto the active, draggable element. */
  handlers: {
    onPointerDown: PointerHandler
    onPointerMove: PointerHandler
    onPointerUp: PointerHandler
    onPointerCancel: PointerHandler
  }
}

/** Matches the resting `transition` React renders on the active card, so the
    snap-back hand-off animates and then lines up with what React thinks. */
const REST_TRANSITION = 'transform 0.4s cubic-bezier(.2,.7,.3,1), opacity 0.4s'

/**
 * Pointer-drag gesture for a swipe card: tracks the live drag offset,
 * distinguishes a tap from a swipe, and resolves a past-threshold drag to a
 * verdict. Extracted from SwipeDeck (ARCH-08).
 *
 * The high-frequency part — the card transform — is applied **imperatively**
 * inside a `requestAnimationFrame` (coalescing bursts of `pointermove` into one
 * DOM write per frame, with `will-change`/`translate3d` so the card composites
 * on the GPU). React state is never touched during the drag, so the card stack
 * doesn't reconcile per frame. The verdict is still resolved synchronously on
 * `pointerup` (read from the offset ref), so callers — and tests — see the same
 * behaviour as before.
 */
export function useSwipeGesture({
  disabled,
  onSwipe,
  onTap,
  cardRef,
  onDragMove,
  onDragEnd,
}: UseSwipeGestureArgs): SwipeGesture {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const tapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // The single per-frame writer: applies the offset to the DOM and pushes it to
  // the (cheap) feedback layer. No React render of the card stack.
  const applyFrame = () => {
    rafRef.current = null
    const { x, y } = offsetRef.current
    const node = cardRef.current
    if (node) {
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${dragRotation(x)}deg)`
    }
    onDragMove?.(x, y)
  }

  const scheduleFrame = () => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(applyFrame)
  }

  const cancelFrame = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const onPointerDown: PointerHandler = (e) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY }
    tapRef.current = { time: Date.now(), x: e.clientX, y: e.clientY }
    offsetRef.current = { x: 0, y: 0 }
    draggingRef.current = true
    const node = cardRef.current
    if (node) {
      // Promote to its own compositor layer for the duration of the drag and
      // stop the resting transition from fighting the per-frame writes.
      node.style.willChange = 'transform'
      node.style.transition = 'none'
      node.style.cursor = 'grabbing'
    }
  }

  const onPointerMove: PointerHandler = (e) => {
    if (!draggingRef.current || !startRef.current) return
    offsetRef.current = {
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    }
    scheduleFrame()
  }

  const onPointerUp: PointerHandler = (e) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    cancelFrame()
    const { x, y } = offsetRef.current
    const node = cardRef.current
    const v = dragVerdict(x, y)
    if (v) {
      // Committing: the card unmounts into the keyframe-driven exit layer, so
      // just drop the GPU hint on the leaving node and let SwipeDeck take over.
      if (node) node.style.willChange = ''
      onSwipe(v, { x, y })
    } else {
      if (node) {
        // Snap back to centre on the compositor, then hand the transform back
        // to React (whose resting value is the same identity transform).
        node.style.transition = REST_TRANSITION
        node.style.transform = 'translate3d(0, 0, 0) rotate(0deg)'
        node.style.cursor = 'grab'
        const settling = node
        window.setTimeout(() => {
          settling.style.willChange = ''
        }, 400)
      }
      const t = tapRef.current
      const dt = t ? Date.now() - t.time : Infinity
      const dist = t ? Math.hypot(e.clientX - t.x, e.clientY - t.y) : Infinity
      if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST) onTap()
    }
    onDragEnd?.()
    startRef.current = null
    tapRef.current = null
    offsetRef.current = { x: 0, y: 0 }
  }

  // Cancel a pending frame if the deck unmounts mid-drag.
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
