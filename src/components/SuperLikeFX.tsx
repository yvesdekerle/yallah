import { useMemo } from 'react'
import { YB } from '../utils/theme.ts'
import { cssVars } from '../utils/css.ts'

function buildStarPath(): string {
  // 10-point polygon — alternating outer / inner radii — for a puffy 5-point
  // star. Inner is intentionally bigger than the golden-ratio default so the
  // "SUPER LIKE" caption fits inside without overlap.
  const cx = 130
  const cy = 135
  const R = 130
  const r = 78
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? R : r
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(
      `${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)}`,
    )
  }
  return `M ${pts.join(' L ')} Z`
}

function SuperLikeStar() {
  const d = useMemo(() => buildStarPath(), [])
  return (
    <div
      className="pointer-events-none absolute animate-yallahBadgePop"
      style={{
        top: '50%',
        left: '50%',
        width: 260,
        height: 270,
        filter: 'drop-shadow(0 20px 40px rgba(239,191,4,0.55))',
      }}
    >
      <svg
        viewBox="0 0 260 270"
        width="260"
        height="270"
        className="block overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="ylhStarFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={YB.topLight} />
            <stop offset="100%" stopColor={YB.top} />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="url(#ylhStarFill)"
          stroke="#fff"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center font-sans text-center"
        style={{
          paddingBottom: 6,
          fontWeight: 800,
          color: YB.ink,
          letterSpacing: 2,
          lineHeight: 0.9,
          textShadow: '0 2px 4px rgba(255,255,255,0.5)',
        }}
      >
        <span style={{ fontSize: 28 }}>SUPER</span>
        <span style={{ fontSize: 28, marginTop: 4 }}>LIKE</span>
      </div>
    </div>
  )
}

interface Sparkle {
  key: number
  dx: number
  dy: number
  delay: number
  dur: number
  size: number
  rot: number
}

function makeSparkles(): Sparkle[] {
  return Array.from({ length: 14 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.2
    const dist = 120 + Math.random() * 80
    return {
      key: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      delay: Math.random() * 80,
      dur: 600 + Math.random() * 250,
      size: 12 + Math.random() * 10,
      rot: Math.random() * 360,
    }
  })
}

/**
 * Full-screen super-like flourish: radial flash, pulsing halo, fanning
 * sparkles, and a popping gold star with "SUPER LIKE" inside. All animations
 * are keyframe-based and trigger once on mount; the parent removes the
 * component after the longest animation completes.
 */
export function SuperLikeFX() {
  const sparkles = useMemo(() => makeSparkles(), [])
  return (
    <div className="pointer-events-none absolute inset-0 z-nav">
      {/* Radial flash */}
      <div
        className="absolute inset-0 animate-yallahFlash"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(239,191,4,0.55), transparent 65%)',
        }}
      />
      {/* Pulsing halo */}
      <div
        className="absolute animate-yallahHaloPulse"
        style={{
          top: '50%',
          left: '50%',
          width: 280,
          height: 280,
          borderRadius: 99,
          border: `6px solid ${YB.top}`,
          boxShadow:
            '0 0 40px 8px rgba(239,191,4,0.4) inset, 0 0 30px rgba(239,191,4,0.5)',
        }}
      />
      {/* Sparkles */}
      {sparkles.map((s) => (
        <div
          key={s.key}
          className="absolute"
          style={cssVars({
            top: '50%',
            left: '50%',
            width: s.size,
            height: s.size,
            '--dx': `${s.dx}px`,
            '--dy': `${s.dy}px`,
            '--rot': `${s.rot}deg`,
            animation: `yallahSparkleFly ${s.dur}ms ${s.delay}ms cubic-bezier(.2,.7,.3,1) forwards`,
          })}
        >
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 2l2.95 6.5L22 9.7l-5.2 5.05L18 22l-6-3.4L6 22l1.2-7.25L2 9.7l7.05-1.2L12 2z"
              fill={s.key % 2 === 0 ? YB.top : YB.topLight}
            />
          </svg>
        </div>
      ))}
      <SuperLikeStar />
    </div>
  )
}
