import { Cards, Results, People } from '../icons/index.tsx'
import { YB } from '../utils/theme.ts'

export type TabIndex = 0 | 1 | 2

interface BottomNavProps {
  /** Index of the active tab. */
  active: TabIndex
  /** Notified when the user taps a tab. */
  onChange: (index: TabIndex) => void
  dark?: boolean
}

const TABS = [
  { icon: Cards, label: 'swipe' },
  { icon: Results, label: 'résultats' },
  { icon: People, label: 'groupe' },
] as const

/** Static bottom navigation with three tabs. */
export function BottomNav({ active, onChange, dark = false }: BottomNavProps) {
  const inkBase = dark ? 'rgba(255,255,255,0.5)' : YB.muted
  const inkActive = dark ? '#fff' : YB.ink

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[20] flex items-center justify-around"
      style={{
        height: 58,
        background: dark ? 'rgba(20,25,40,0.95)' : 'rgba(255,253,247,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: dark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(20,30,50,0.08)',
        // Extend the bar through the iOS home-indicator area in standalone mode.
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'content-box',
        // Pin to its own GPU layer so it stays painted stably during tab
        // switches (no transient blank state under iOS Safari).
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {TABS.map((tab, i) => {
        const Icon = tab.icon
        const isActive = active === i
        const c = isActive ? inkActive : inkBase
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => onChange(i as TabIndex)}
            className="relative flex flex-col items-center gap-[2px] bg-transparent border-0 cursor-pointer"
            style={{ color: c, padding: 0 }}
            aria-pressed={isActive}
            aria-label={tab.label}
          >
            <Icon color={c} size={22} />
            <span
              className="font-sans"
              style={{
                fontSize: 9.5,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: 0.3,
              }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute"
                style={{
                  top: -6,
                  width: 22,
                  height: 3,
                  borderRadius: 99,
                  background: YB.coral,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
