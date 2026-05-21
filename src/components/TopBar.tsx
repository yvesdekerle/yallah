import { YB } from '../utils/theme.ts'

interface TopBarProps {
  /** When true, wordmark renders in white (for dark backgrounds). */
  dark?: boolean
}

/** Centered `yallah` wordmark with a coral dot accent. */
export function TopBar({ dark = false }: TopBarProps) {
  return (
    <div
      className="phone-topbar pointer-events-none absolute left-0 right-0 z-[8]"
      style={{ top: 40, height: 44 }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-baseline gap-1 font-sans"
        style={{
          fontWeight: 800,
          fontSize: 22,
          color: dark ? '#fff' : YB.ink,
          letterSpacing: -0.4,
          lineHeight: 1,
        }}
      >
        <span>yallah</span>
        <span style={{ color: YB.coral, fontSize: 26, lineHeight: 0.6 }}>·</span>
      </div>
    </div>
  )
}
