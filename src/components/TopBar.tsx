import { YB } from '../utils/theme.ts'

interface TopBarProps {
  /** When true, wordmark renders in white (for dark backgrounds). */
  dark?: boolean
  /** Background colour of the banner. Defaults to the sun yellow. */
  bg?: string
}

/**
 * Centered `yallah` wordmark with a coral dot accent.
 *
 * Renders as a SOLID banner from y=0 down past the wordmark so that
 * content scrolled within Résultats / Groupe disappears smoothly under
 * it instead of bleeding through. Height adapts to iOS safe-area-inset-top
 * in standalone mode.
 */
export function TopBar({ dark = false, bg = YB.bgSun }: TopBarProps) {
  return (
    <div
      className="phone-topbar absolute left-0 right-0 z-[8]"
      style={{
        top: 0,
        height: 'calc(env(safe-area-inset-top, 0px) + 60px)',
        background: bg,
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 inline-flex items-baseline gap-1 font-sans"
        style={{
          // Pinned ~16px above the banner's bottom edge — lifts the
          // wordmark visually closer to the top of the screen so it
          // doesn't sit over the first row of scrolled content.
          bottom: 16,
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
