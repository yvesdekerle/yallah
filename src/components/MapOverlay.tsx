import { lazy, Suspense } from 'react'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'
import type { MapView } from '../types/map.ts'
import { YB } from '../utils/theme.ts'
import { useMapPins } from '../hooks/useMapPins.ts'

// Leaflet is heavy (~tens of KB). Keep FullscreenMap behind a dynamic import so
// it lands in its own chunk and never weighs down the Swipe tab's main bundle.
// The bundle-size guard (scripts/check-bundle-size.ts) fails the build if a
// Leaflet fingerprint leaks into `index-*`, so this `lazy()` must stay.
const FullscreenMap = lazy(() =>
  import('./FullscreenMap.tsx').then((m) => ({
    default: m.FullscreenMap,
  })),
)

interface MapOverlayProps {
  /** Which map to render — all liked pins, or a single activity centred. */
  view: MapView
  history: VoteEntry[]
  activities: Activity[]
  /** True when the map must sit ABOVE a still-open DetailModal (z 60 vs 40),
      e.g. when opened from the DetailModal mini-map. */
  aboveDetail: boolean
  onClose: () => void
  /** Opening an activity from a pin popup — App keeps the map mounted underneath
      so closing the detail sheet returns here, not to the deck. */
  onSelectActivity: (a: Activity) => void
}

/**
 * The fullscreen Leaflet map overlay. Owns its own pin derivation (`useMapPins`)
 * and lazy-loads `FullscreenMap` so Leaflet stays out of the main bundle.
 * Rendered only while a map is open (App gates on `mapView`), so the pin
 * computation runs lazily too — nothing is derived while the map is closed.
 */
export function MapOverlay({
  view,
  history,
  activities,
  aboveDetail,
  onClose,
  onSelectActivity,
}: MapOverlayProps) {
  const { likedPins, singleMapPin } = useMapPins(history, activities)
  const pins =
    view.mode === 'single' ? singleMapPin(view.activityId) : likedPins
  const initialCenter =
    view.mode === 'single' ? (pins[0]?.coords ?? undefined) : undefined

  return (
    <Suspense
      fallback={
        <div
          className="absolute inset-0 z-[40]"
          style={{ background: YB.bgSoft }}
        />
      }
    >
      <FullscreenMap
        pins={pins}
        initialCenter={initialCenter}
        onClose={onClose}
        onSelectActivity={onSelectActivity}
        zIndex={aboveDetail ? 60 : 40}
      />
    </Suspense>
  )
}
