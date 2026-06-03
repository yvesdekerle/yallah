import type { ReactNode } from 'react'
import { YB } from '../utils/theme.ts'
import { Wordmark } from './Wordmark.tsx'

interface WelcomeScreenProps {
  /** The Google sign-in button (real one, or a disabled fallback). */
  googleSlot: ReactNode
  /** Enter the local demo flow → opens the IdentityPicker. */
  onDemo: () => void
}

/**
 * First screen on launch (shown while no identity is set). Logo on top, two
 * entry points at the bottom: Google sign-in (passed in as `googleSlot` so the
 * OAuth-hook component only mounts when available) and the local demo flow.
 * Purely presentational — testable without the Google provider.
 */
export function WelcomeScreen({ googleSlot, onDemo }: WelcomeScreenProps) {
  return (
    <div
      className="absolute inset-0 z-overlay flex flex-col font-sans"
      role="dialog"
      aria-label="Bienvenue sur yallah"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <Wordmark size={56} />
      </div>

      <div className="flex flex-col" style={{ gap: 12, padding: '0 28px' }}>
        {googleSlot}
        <button
          type="button"
          onClick={onDemo}
          className="font-sans w-full"
          style={{
            padding: '13px 0',
            borderRadius: 99,
            background: YB.ink,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Mode démo
        </button>
      </div>
    </div>
  )
}
