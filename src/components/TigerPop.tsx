import { useEffect } from 'react'
import { YB } from '../utils/theme.ts'

interface TigerPopProps {
  /** Auto-dismiss delay in ms. Defaults to 2600. */
  duration?: number
  onDone: () => void
}

/**
 * One-time celebratory welcome shown on a user's very first sign-in (Google OR
 * demo identity pick). A tiger head zooms in from far away and pops, with
 * "Tié un tigre !" underneath. Self-dismisses after `duration`, or on tap.
 *
 * The tiger is an emoji (🐯) — swap the `<span aria-hidden>` for an `<img>` if
 * a licence-clean asset is added later; the pop animation is asset-agnostic.
 */
export function TigerPop({ duration = 2600, onDone }: TigerPopProps) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div
      role="status"
      aria-label="Tié un tigre !"
      onClick={onDone}
      className="absolute inset-0 flex flex-col items-center justify-center font-sans"
      style={{
        zIndex: 200,
        background: 'rgba(20,25,40,0.5)',
        backdropFilter: 'blur(2px)',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden
        className="animate-yallahTigerPop"
        style={{
          fontSize: 132,
          lineHeight: 1,
          filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.45))',
        }}
      >
        🐯
      </span>
      <p
        className="m-0 animate-yallahFadeUp"
        style={{
          marginTop: 18,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: '#fff',
          textShadow: '0 3px 16px rgba(0,0,0,0.5)',
        }}
      >
        Tié un tigre !
      </p>
      <span
        aria-hidden
        style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: YB.bgSun }}
        className="animate-yallahFadeUp"
      >
        🐯 Rrrooaar
      </span>
    </div>
  )
}
