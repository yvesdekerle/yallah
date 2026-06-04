import { useRef } from 'react'
import { YB } from '../utils/theme.ts'
import { Wordmark } from './Wordmark.tsx'
import { ProfileMenu } from './ProfileMenu.tsx'

/** Minimal identity the TopBar needs to render the profile avatar + menu. */
export interface TopBarProfile {
  name: string
  picture?: string
  color: string
}

interface TopBarProps {
  /** When true, wordmark renders in white (for dark backgrounds). */
  dark?: boolean
  /** Background colour of the banner. Defaults to the sun yellow. */
  bg?: string
  /** Hidden gesture: 5 consecutive taps on the wordmark fires this. */
  onSecretOpen?: () => void
  /** Current identity (Google or demo). When set, shows the avatar + menu. */
  profile?: TopBarProfile | null
  /** Sign out (used by the menu's "Se déconnecter" — both modes). */
  onLogout?: () => void
  /** Open the Réglages page (used by the menu's "Paramètres" entry). */
  onOpenSettings?: () => void
  /** Toast after the share link is copied (forwarded to ProfileMenu). */
  onShared?: (message: string) => void
}

// Max gap between two taps for them to still count as "consecutive".
const TAP_WINDOW_MS = 800
const TAPS_TO_OPEN = 5

/**
 * Centered `yallah` wordmark with a coral dot accent.
 *
 * Renders as a SOLID banner from y=0 down past the wordmark so that
 * content scrolled within Résultats / Groupe disappears smoothly under
 * it instead of bleeding through. Height adapts to iOS safe-area-inset-top
 * in standalone mode.
 *
 * Tapping the wordmark 5 times in a row (each within TAP_WINDOW_MS of the
 * previous) opens the hidden Réglages page — the only way in.
 */
export function TopBar({
  dark = false,
  bg = YB.bgSun,
  onSecretOpen,
  profile,
  onLogout,
  onOpenSettings,
  onShared,
}: TopBarProps) {
  const taps = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = () => {
    if (!onSecretOpen) return
    taps.current += 1
    if (timer.current) clearTimeout(timer.current)
    if (taps.current >= TAPS_TO_OPEN) {
      taps.current = 0
      onSecretOpen()
      return
    }
    timer.current = setTimeout(() => {
      taps.current = 0
    }, TAP_WINDOW_MS)
  }

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
        onClick={handleTap}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          // Pinned ~16px above the banner's bottom edge — lifts the
          // wordmark visually closer to the top of the screen so it
          // doesn't sit over the first row of scrolled content.
          bottom: 16,
        }}
      >
        <Wordmark dark={dark} />
      </div>

      {profile && onLogout && onOpenSettings && (
        <div className="absolute" style={{ right: 16, bottom: 13 }}>
          <ProfileMenu
            name={profile.name}
            {...(profile.picture ? { picture: profile.picture } : {})}
            color={profile.color}
            onLogout={onLogout}
            onOpenSettings={onOpenSettings}
            {...(onShared ? { onShared } : {})}
          />
        </div>
      )}
    </div>
  )
}
