import type { Verdict } from '../types/verdict.ts'
import { EXIT_DIST, SWIPE_H, SWIPE_V } from '../constants/swipe.ts'

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Determine which verdict (if any) the current drag offset corresponds to.
 *
 * Horizontal is favoured over vertical when |x| > |y| * 0.7 — this matches
 * the user's natural tendency to drift up/down a little while swiping
 * sideways. Threshold is 40% of the canonical swipe distance, after which the
 * card snaps visually but the user can still revert before releasing.
 */
export function dragVerdict(x: number, y: number): Verdict | null {
  if (Math.abs(x) > Math.abs(y) * 0.7) {
    if (x > SWIPE_H * 0.4) return 'oui'
    if (x < -SWIPE_H * 0.4) return 'non'
  } else {
    if (y < -SWIPE_V * 0.4) return 'top'
    if (y > SWIPE_V * 0.4) return 'whynot'
  }
  return null
}

export interface ExitOffset {
  x: number
  y: number
  r: number
}

/**
 * Off-screen target position used to animate the exiting card. Slight upward
 * lift + rotation makes horizontal exits feel natural; vertical exits stay
 * centred. `top` (super-like) flies up, `whynot` drops down — matching the
 * swipe gestures.
 */
export function exitOffset(verdict: Verdict): ExitOffset {
  switch (verdict) {
    case 'oui':
      return { x: EXIT_DIST, y: -40, r: 22 }
    case 'non':
      return { x: -EXIT_DIST, y: -40, r: -22 }
    case 'whynot':
      return { x: 0, y: EXIT_DIST, r: 0 }
    case 'top':
      return { x: 0, y: -EXIT_DIST, r: 0 }
    case 'skip':
      // Skipped cards slide off to the right, slightly different angle
      // so they look distinct from a "oui" exit.
      return { x: EXIT_DIST, y: 0, r: 0 }
  }
}

/**
 * Visual rotation in degrees while dragging — capped at ±18° so the card
 * never looks unhinged even if the pointer flies sideways.
 */
export function dragRotation(x: number): number {
  return clamp(x / 14, -18, 18)
}

/**
 * 0..1 intensity, used to fade in stamps and tint the background while
 * dragging.
 */
export function dragIntensity(x: number, y: number): number {
  return clamp(Math.max(Math.abs(x), Math.abs(y)) / 200, 0, 1)
}
