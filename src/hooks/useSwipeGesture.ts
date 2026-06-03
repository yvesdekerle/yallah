import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Verdict } from '../types/verdict.ts'
import { dragVerdict } from '../utils/swipe.ts'
import { TAP_MAX_MS, TAP_MAX_DIST } from '../constants/swipe.ts'

export interface DragState {
  x: number
  y: number
  dragging: boolean
}

interface UseSwipeGestureArgs {
  /** Ignore gestures (e.g. while a card exits or the deck is empty). */
  disabled: boolean
  /** A drag past the verdict threshold; `from` is the release offset (for the
      exit animation). */
  onSwipe: (verdict: Verdict, from: { x: number; y: number }) => void
  /** A tap (fast, small movement) rather than a swipe. */
  onTap: () => void
}

type PointerHandler = (e: ReactPointerEvent<HTMLDivElement>) => void

export interface SwipeGesture {
  drag: DragState
  /** Spread onto the active, draggable element. */
  handlers: {
    onPointerDown: PointerHandler
    onPointerMove: PointerHandler
    onPointerUp: PointerHandler
    onPointerCancel: PointerHandler
  }
}

/**
 * Pointer-drag gesture for a swipe card: tracks the live drag offset,
 * distinguishes a tap from a swipe, and resolves a past-threshold drag to a
 * verdict. Extracted from SwipeDeck (ARCH-08) — the deck renders the card
 * transform + stamps from the returned `drag`.
 */
export function useSwipeGesture({
  disabled,
  onSwipe,
  onTap,
}: UseSwipeGestureArgs): SwipeGesture {
  const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, dragging: false })
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const tapRef = useRef<{ time: number; x: number; y: number } | null>(null)

  const onPointerDown: PointerHandler = (e) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY }
    tapRef.current = { time: Date.now(), x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0, dragging: true })
  }

  const onPointerMove: PointerHandler = (e) => {
    if (!drag.dragging || !startRef.current) return
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
      dragging: true,
    })
  }

  const onPointerUp: PointerHandler = (e) => {
    if (!drag.dragging) return
    const v = dragVerdict(drag.x, drag.y)
    if (v) {
      onSwipe(v, { x: drag.x, y: drag.y })
    } else {
      const t = tapRef.current
      const dt = t ? Date.now() - t.time : Infinity
      const dist = t ? Math.hypot(e.clientX - t.x, e.clientY - t.y) : Infinity
      if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST) onTap()
    }
    setDrag({ x: 0, y: 0, dragging: false })
    startRef.current = null
    tapRef.current = null
  }

  return {
    drag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
