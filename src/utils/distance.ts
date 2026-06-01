import type { Coords } from './coords.ts'

export interface NamedBase {
  id: string
  label: string
  coords: Coords
}

export const BASE_TAMARIN: NamedBase = {
  id: 'tamarin',
  label: 'Tamarin',
  coords: { lat: -20.329, lng: 57.378 },
}

export const BASE_TROU_AUX_BICHES: NamedBase = {
  id: 'trou-aux-biches',
  label: 'Trou aux Biches',
  coords: { lat: -20.044, lng: 57.537 },
}

export const BASES: readonly NamedBase[] = [
  BASE_TAMARIN,
  BASE_TROU_AUX_BICHES,
] as const

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x))
}

const ROAD_DETOUR_FACTOR = 1.4
const AVG_SPEED_KMH = 40

/**
 * Rough drive-time estimate for Mauritius: applies a detour factor to the
 * straight-line distance and divides by an average speed. Returns a short
 * human-readable string like "~25 min" or "~1h15".
 */
export function estimateDriveTime(coords: Coords, base: NamedBase): string {
  const km = haversineKm(coords, base.coords) * ROAD_DETOUR_FACTOR
  const minutes = (km / AVG_SPEED_KMH) * 60
  if (minutes < 8) return '~5 min'
  if (minutes < 60) {
    const rounded = Math.round(minutes / 5) * 5
    return `~${rounded} min`
  }
  const hours = Math.floor(minutes / 60)
  const remMin = Math.round((minutes - hours * 60) / 5) * 5
  if (remMin === 0) return `~${hours}h`
  if (remMin === 60) return `~${hours + 1}h`
  return `~${hours}h${remMin.toString().padStart(2, '0')}`
}
