import { Cards, Results, People, FullscreenEnter, FullscreenExit } from '../icons/index.tsx'
import { useFullscreen } from '../hooks/useFullscreen.ts'
import { YB } from '../utils/theme.ts'

interface BottomNavProps {
  /** Index of the active tab. */
  active?: 0 | 1 | 2
  dark?: boolean
}

const TABS = [
  { icon: Cards, label: 'swipe' },
  { icon: Results, label: 'résultats' },
  { icon: People, label: 'groupe' },
] as const

/**
 * Static bottom navigation with a fullscreen toggle on the far left.
 *
 * Only the "swipe" tab is implemented in v1; the other tabs are visible but
 * inert. The fullscreen button uses the Fullscreen API (skipped on iOS
 * iPhone which doesn't support it).
 */
export function BottomNav({ active = 0, dark = false }: BottomNavProps) {
  const inkBase = dark ? 'rgba(255,255,255,0.5)' : YB.muted
  const inkActive = dark ? '#fff' : YB.ink
  const { supported, isFullscreen, toggle } = useFullscreen()

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[6] flex items-center"
      style={{
        height: 58,
        background: dark ? 'rgba(20,25,40,0.95)' : 'rgba(255,253,247,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: dark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(20,30,50,0.08)',
        paddingBottom: 6,
      }}
    >
      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={
            isFullscreen ? 'quitter le plein écran' : 'passer en plein écran'
          }
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className="flex items-center justify-center border-0 bg-transparent cursor-pointer"
          style={{
            width: 44,
            height: 44,
            marginLeft: 6,
            color: inkBase,
            padding: 0,
          }}
        >
          {isFullscreen ? (
            <FullscreenExit color={inkBase} size={22} />
          ) : (
            <FullscreenEnter color={inkBase} size={22} />
          )}
        </button>
      )}

      <div className="flex flex-1 items-center justify-around">
        {TABS.map((tab, i) => {
          const Icon = tab.icon
          const isActive = active === i
          const c = isActive ? inkActive : inkBase
          return (
            <button
              key={tab.label}
              type="button"
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
    </div>
  )
}
