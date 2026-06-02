import { YB } from '../utils/theme.ts'

interface SplashProps {
  /** Switch from the loading skeleton to an error + retry affordance. */
  error?: boolean
  /** Invoked by the "Réessayer" button (error variant only). */
  onRetry?: () => void
}

/**
 * First-paint placeholder shown by `main.tsx` while the code-split activities
 * chunk loads (and an error fallback if it can't). Kept dependency-light so it
 * ships in the entry chunk and renders instantly — no white flash before the
 * deck appears.
 */
export function Splash({ error = false, onRetry }: SplashProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center font-sans"
      style={{ background: YB.bgSun, color: YB.ink }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-baseline"
        style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}
      >
        yallah
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: YB.coral,
            marginLeft: 4,
            alignSelf: 'flex-end',
            marginBottom: 8,
          }}
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center" style={{ marginTop: 18 }}>
          <p style={{ fontSize: 14, color: YB.ink2, margin: '0 0 14px' }}>
            Impossible de charger les activités.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="font-sans cursor-pointer border-0"
            style={{
              padding: '11px 22px',
              borderRadius: 99,
              background: YB.coral,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {/* Card-shaped skeleton so the layout reads as "the deck is coming",
              not a blank screen. */}
          <div
            className="animate-pulse"
            style={{
              width: 220,
              height: 280,
              borderRadius: 22,
              background: YB.bgSoft,
              marginTop: 26,
            }}
            aria-hidden
          />
          <p style={{ fontSize: 13, color: YB.ink2, marginTop: 16 }}>Chargement…</p>
        </>
      )}
    </div>
  )
}
