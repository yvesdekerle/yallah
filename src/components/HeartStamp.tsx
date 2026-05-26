import { YB } from '../utils/theme.ts'

interface HeartStampProps {
  /** 0..1 — controls opacity and a slight scale-in. */
  intensity: number
}

/**
 * The "OUI" overlay — a sticker-shaped pink heart with white "OUI" lettering
 * baked in. Tilted slightly for personality.
 */
export function HeartStamp({ intensity }: HeartStampProps) {
  const color = YB.oui
  const opacity = Math.min(1, intensity * 1.4 + 0.1)
  return (
    <div
      className="pointer-events-none absolute z-[9]"
      style={{
        top: '36%',
        left: '50%',
        width: 200,
        height: 180,
        transform: `translate(-50%, -50%) rotate(-8deg) scale(${0.85 + intensity * 0.25})`,
        opacity,
        filter: `drop-shadow(0 12px 24px ${color}55)`,
        transition: 'opacity 0.1s',
      }}
    >
      <svg
        viewBox="0 0 200 180"
        width="200"
        height="180"
        className="block"
        aria-hidden
      >
        <path
          d="M100 168 C 100 168, 14 116, 14 56 C 14 28, 38 12, 62 12 C 82 12, 96 24, 100 42 C 104 24, 118 12, 138 12 C 162 12, 186 28, 186 56 C 186 116, 100 168, 100 168 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="6"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-sans text-white"
        style={{
          bottom: 28,
          fontWeight: 800,
          fontSize: 48,
          letterSpacing: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        LIKE
      </div>
    </div>
  )
}
