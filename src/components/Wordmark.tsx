import { YB } from '../utils/theme.ts'

interface WordmarkProps {
  /** Font size of the "yallah" text in px. The coral dot scales with it. */
  size?: number
  /** Render the text in white (for dark backgrounds). */
  dark?: boolean
}

/**
 * The `yallah ·` wordmark: bold text + a coral dot accent. Shared by the TopBar
 * banner and the WelcomeScreen so the logo has a single source of truth. Purely
 * presentational — interactions (e.g. the TopBar 5-tap gesture) live in callers.
 */
export function Wordmark({ size = 22, dark = false }: WordmarkProps) {
  return (
    <span
      className="inline-flex items-baseline gap-1 font-sans select-none"
      style={{
        fontWeight: 800,
        fontSize: size,
        color: dark ? '#fff' : YB.ink,
        letterSpacing: -0.4,
        lineHeight: 1,
      }}
    >
      <span>yallah</span>
      <span
        style={{ color: YB.coral, fontSize: size * 1.18, lineHeight: 0.6 }}
        aria-hidden
      >
        ·
      </span>
    </span>
  )
}
