import { useCallback, useState } from 'react'
import type { Activity } from '../types/activity.ts'
import type { MapView } from '../types/map.ts'

/** How the DetailModal was opened — drives whether votes advance the deck. */
export type DetailState = {
  activity: Activity
  source: 'swipe' | 'review'
} | null

/**
 * Owns the App-level overlay state: the detail sheet, the fullscreen map
 * (incl. the z-stacking flag when it's opened above the detail sheet), and the
 * three confirm dialogs. Pure visibility state — the confirm *actions* live in
 * App where they orchestrate across hooks.
 */
export function useModalOverlays() {
  const [detail, setDetail] = useState<DetailState>(null)
  const [mapView, setMapView] = useState<MapView | null>(null)
  // When true the FullscreenMap renders ABOVE a still-open DetailModal (opened
  // from the mini-map) so closing the map returns to the sheet, not the deck.
  const [mapAboveDetail, setMapAboveDetail] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [confirmingRandomFill, setConfirmingRandomFill] = useState(false)
  const [confirmingDeleteActivity, setConfirmingDeleteActivity] = useState<
    string | null
  >(null)

  // Open the map on top of the detail sheet (from the DetailModal mini-map).
  const openMapAboveDetail = useCallback((view: MapView) => {
    setMapView(view)
    setMapAboveDetail(true)
  }, [])

  const closeMap = useCallback(() => {
    setMapView(null)
    setMapAboveDetail(false)
  }, [])

  return {
    detail,
    setDetail,
    mapView,
    setMapView,
    mapAboveDetail,
    setMapAboveDetail,
    openMapAboveDetail,
    closeMap,
    confirmingReset,
    setConfirmingReset,
    confirmingRandomFill,
    setConfirmingRandomFill,
    confirmingDeleteActivity,
    setConfirmingDeleteActivity,
  }
}
