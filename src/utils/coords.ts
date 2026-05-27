import coordsData from '../data/coords.json'
import overridesData from '../data/coords-overrides.json'

export interface Coords {
  lat: number
  lng: number
}

interface CoordEntry {
  lat: number
  lng: number
  source: 'nominatim'
}

const coords = coordsData as Record<string, CoordEntry | null>
const overrides = overridesData as Record<string, Coords>

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
