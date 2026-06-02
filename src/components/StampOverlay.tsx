import type { Verdict } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'

interface StampOverlayProps {
  verdict: Verdict
  /** 0..1 — controls opacity and a subtle scale-in. */
  intensity: number
}

const ROTATION: Record<Verdict, number> = {
  oui: -10,
  non: 10,
  whynot: -4,
  top: 0,
}

/**
 * Centered "NON / WHY NOT" rubber-stamp overlay (the OUI variant has its own
 * heart-shaped component). Rendered above the card, pinned to the deck centre
 * during drag, then baked into the exiting card wrapper so it slides off
 * with the card.
 */
export function StampOverlay({ verdict, intensity }: StampOverlayProps) {
  const meta = VERDICT_META[verdict]
  const rot = ROTATION[verdict]
  const opacity = Math.min(1, intensity * 1.4 + 0.1)
  return (
    <div
      className="pointer-events-none absolute z-[9] font-sans"
      style={{
        top: '38%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${0.85 + intensity * 0.2})`,
        padding: '10px 22px',
        border: `5px solid ${meta.color}`,
        borderRadius: 14,
        color: meta.color,
        background: 'rgba(255,255,255,0.96)',
        fontWeight: 800,
        fontSize: 36,
        letterSpacing: 2,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: `0 12px 30px -8px ${meta.color}80, 0 0 0 4px rgba(255,255,255,0.4)`,
        opacity,
        transition: 'opacity 0.1s',
      }}
    >
      {meta.label}
    </div>
  )
}
