import { YB } from '../utils/theme.ts'

interface StatusBarProps {
  /** Defaults to ink black; pass white for dark backgrounds. */
  color?: string
}

/** Decorative iOS-style status bar (time / signal / battery). */
export function StatusBar({ color = YB.ink }: StatusBarProps) {
  return (
    <div
      className="phone-statusbar absolute left-0 right-0 z-[8] flex items-center justify-between font-sans font-semibold"
      style={{
        top: 12,
        padding: '0 30px',
        fontSize: 13,
        color,
        letterSpacing: 0.2,
      }}
    >
      <span>9:41</span>
      <span className="inline-flex items-center gap-[6px]" style={{ fontSize: 11 }}>
        <span style={{ letterSpacing: 1 }}>●●●●</span>
        <span className="font-mono">76%</span>
      </span>
    </div>
  )
}
