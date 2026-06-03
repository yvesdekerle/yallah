import { useRef } from 'react'
import { YB } from '../utils/theme.ts'
import { X } from '../icons/index.tsx'
import { useModalA11y } from '../hooks/useModalA11y.ts'

/**
 * Hidden "Réglages" page, reachable only via 5 consecutive taps on the TopBar
 * wordmark. For now it just surfaces the app version; it's the home for future
 * dev/settings toggles (e.g. the tuto mode). Full-screen overlay, closable.
 */
export function SettingsModal({
  version,
  onClose,
  onGoHome,
}: {
  version: string
  onClose: () => void
  /** Return to the welcome screen (clears the current identity / session). */
  onGoHome: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalA11y(ref, { onClose })

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Réglages"
      className="absolute inset-0 z-settings font-sans outline-none"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="fermer les réglages"
        className="absolute inline-flex items-center justify-center cursor-pointer border-0"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 18,
          width: 40,
          height: 40,
          borderRadius: 99,
          background: YB.surface,
          boxShadow: '0 2px 8px -2px rgba(20,30,50,0.15)',
        }}
      >
        <X color={YB.ink} size={18} />
      </button>

      <div style={{ padding: '8px 22px' }}>
        <h1
          className="m-0"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}
        >
          Réglages
        </h1>

        <div
          className="flex items-center yallah-card"
          style={{
            justifyContent: 'space-between',
            marginTop: 24,
            padding: '14px 16px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: YB.ink2 }}>
            Version
          </span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>v{version}</span>
        </div>

        <a
          href="https://docs.google.com/spreadsheets/d/1kPmZExsNV8C05CuWg8tyiRA1l4Jm7CftUSMxPohm1w4/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center no-underline yallah-card"
          style={{
            justifyContent: 'space-between',
            marginTop: 12,
            padding: '14px 16px',
            color: 'inherit',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: YB.ink2 }}>
            Tableur des activités
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: YB.coral,
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir ↗
          </span>
        </a>

        <button
          type="button"
          onClick={onGoHome}
          className="font-sans cursor-pointer w-full"
          style={{
            marginTop: 24,
            padding: '13px 0',
            borderRadius: 99,
            background: YB.coral,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
          }}
        >
          ← Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
