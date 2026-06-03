import { useEffect } from 'react'
import { YB } from '../utils/theme.ts'

interface ToastProps {
  text: string
  emoji?: string | undefined
  /** Auto-dismiss delay in ms. Defaults to 2400. Set 0 to disable. */
  duration?: number
  onDone: () => void
}

/**
 * Lightweight bottom-floating toast. Self-dismisses after `duration` ms via
 * `onDone`. Multiple toasts in flight: rotate `key` on the parent so the
 * component remounts and the timer restarts.
 */
export function Toast({ text, emoji, duration = 2400, onDone }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div
      role="status"
      className="absolute z-chrome inline-flex items-center font-sans animate-yallahToast"
      style={{
        bottom: 162,
        left: '50%',
        transform: 'translateX(-50%)',
        background: YB.ink,
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        gap: 8,
        whiteSpace: 'nowrap',
        boxShadow: '0 12px 30px -8px rgba(20,30,50,0.4)',
      }}
    >
      {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
      {text}
    </div>
  )
}
