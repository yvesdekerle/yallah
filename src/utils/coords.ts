import coordsData from '../data/coords.json'
import overridesData from '../data/coords-overrides.json'
import type { Activity } from '../types/activity.ts'

export interface Coords {
  lat: number
  lng: number
}

// `source` ('nominatim') is recorded in coords.json for provenance but never
// read at runtime, so it's intentionally absent here — the extra JSON field is
// ignored by structural assignment.
interface CoordEntry {
  lat: number
  lng: number
}

const coords: Record<string, CoordEntry | null> = coordsData
const overrides: Record<string, Coords> = overridesData

/**
 * Look up the geographic coordinates for an activity.
 *
 * Override wins. Otherwise, fall back to the Nominatim-generated
 * `coords.json`. Returns `null` if neither source has a value (the
 * caller is expected to show a "no location" placeholder).
 */
export function getCoords(activityId: string): Coords | null {
  const override = overrides[activityId]
  if (override) return { lat: override.lat, lng: override.lng }
  const entry = coords[activityId]
  if (entry) return { lat: entry.lat, lng: entry.lng }
  return null
}

/**
 * Resolve coordinates for an activity. User-added activities carry their own
 * `coords`; curated ones look up the Nominatim/override data by id. Returns
 * `null` when neither source has a value.
 */
export function coordsFor(activity: Activity): Coords | null {
  if (activity.coords) return { lat: activity.coords.lat, lng: activity.coords.lng }
  return getCoords(activity.id)
}
