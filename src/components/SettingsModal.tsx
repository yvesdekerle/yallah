import { YB } from '../utils/theme.ts'
import { X } from '../icons/index.tsx'

/**
 * Hidden "Réglages" page, reachable only via 5 consecutive taps on the TopBar
 * wordmark. For now it just surfaces the app version; it's the home for future
 * dev/settings toggles (e.g. the tuto mode). Full-screen overlay, closable.
 */
export function SettingsModal({
  version,
  onClose,
}: {
  version: string
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="Réglages"
      className="absolute inset-0 z-[80] font-sans"
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
          background: '#fff',
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
          className="flex items-center"
          style={{
            justifyContent: 'space-between',
            marginTop: 24,
            padding: '14px 16px',
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: YB.ink2 }}>
            Version
          </span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>v{version}</span>
        </div>
      </div>
    </div>
  )
}
