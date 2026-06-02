import { lazy, Suspense } from 'react'
import type { Activity } from '../types/activity.ts'
import type { MapView } from '../types/map.ts'
import { YB } from '../utils/theme.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { coordsFor } from '../utils/coords.ts'
import { heroPhotoUrl } from '../utils/photos.ts'

// Keep the Leaflet-backed mini-map behind its own lazy boundary so it (and
// Leaflet) stays out of the main chunk — see the Swipe-tab bundle budget.
const ActivityMiniMap = lazy(() =>
  import('./ActivityMiniMap.tsx').then((m) => ({ default: m.ActivityMiniMap })),
)

/**
 * "Sur la carte" section: the passive mini-map. Uses `heroPhotoUrl` (a
 * different, larger crop than the modal hero's `detailPhotos[0]`) for the pin
 * thumbnail — intentionally NOT the same URL as the hero.
 */
export function DetailMap({
  activity,
  onOpenMap,
}: {
  activity: Activity
  onOpenMap?: (view: MapView) => void
}) {
  return (
    <>
      <SectionHeading>Sur la carte</SectionHeading>
      <div style={{ marginBottom: 24 }}>
        <Suspense
          fallback={
            <div
              style={{
                height: 180,
                background: YB.bgSoft,
                borderRadius: 12,
              }}
            />
          }
        >
          <ActivityMiniMap
            coords={coordsFor(activity)}
            pinColor={YB.coral}
            photo={heroPhotoUrl(activity)}
            onExpand={
              onOpenMap
                ? () =>
                    onOpenMap({
                      mode: 'single',
                      activityId: activity.id,
                    })
                : undefined
            }
          />
        </Suspense>
      </div>
    </>
  )
}
