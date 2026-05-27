/**
 * Geocode each activity's `location` text to lat/lng via the public
 * Nominatim API (OSM). Free, no key required, but please respect the
 * 1 req/s policy and ship a real User-Agent.
 *
 * Usage:
 *   npm run geocode:activities                # geocode only entries currently null
 *   npm run geocode:activities -- --force     # re-geocode everything
 *   npm run geocode:activities -- --only=a012,a045
 *
 * Outputs `src/data/coords.json` of shape:
 *   { "a001": { "lat": ..., "lng": ..., "source": "nominatim" } | null }
 *
 * For each activity, returns `null` if Nominatim has no result OR if
 * the returned point falls outside Mauritius' rough bounding box.
 * Hand-curate the misses in `src/data/coords-overrides.json`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Activity } from '../src/types/activity.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ACTIVITIES_PATH = resolve(ROOT, 'src/data/activities.json')
const COORDS_PATH = resolve(ROOT, 'src/data/coords.json')

// Mauritius rough bbox — lat/lng. Reject anything outside (Nominatim
// sometimes returns Mauritius-look-alikes elsewhere on the planet).
const BBOX = {
  minLat: -20.6,
  maxLat: -19.9,
  minLng: 57.2,
  maxLng: 57.9,
}

const USER_AGENT = 'yallah-geocoder/1.0 (yves.dekerle@gmail.com)'
const THROTTLE_MS = 1200

interface CoordEntry {
  lat: number
  lng: number
  source: 'nominatim'
}

interface CliFlags {
  force: boolean
  only: Set<string> | null
}

function parseFlags(): CliFlags {
  const args = process.argv.slice(2)
  let force = false
  let only: Set<string> | null = null
  for (const a of args) {
    if (a === '--force') force = true
    else if (a.startsWith('--only=')) {
      only = new Set(a.slice('--only='.length).split(','))
    }
  }
  return { force, only }
}

function loadActivities(): Activity[] {
  return JSON.parse(readFileSync(ACTIVITIES_PATH, 'utf8'))
}

function loadCoords(): Record<string, CoordEntry | null> {
  if (!existsSync(COORDS_PATH)) return {}
  return JSON.parse(readFileSync(COORDS_PATH, 'utf8'))
}

function saveCoords(c: Record<string, CoordEntry | null>): void {
  // Stable key order so the file diff is readable in git.
  const sorted: Record<string, CoordEntry | null> = {}
  for (const k of Object.keys(c).sort()) sorted[k] = c[k]!
  writeFileSync(COORDS_PATH, JSON.stringify(sorted, null, 2) + '\n')
}

function inBbox(lat: number, lng: number): boolean {
  return (
    lat >= BBOX.minLat &&
    lat <= BBOX.maxLat &&
    lng >= BBOX.minLng &&
    lng <= BBOX.maxLng
  )
}

async function geocode(location: string): Promise<CoordEntry | null> {
  const q = encodeURIComponent(`${location} Mauritius`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} for "${location}"`)
    return null
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string }>
  if (data.length === 0) return null
  const lat = parseFloat(data[0]!.lat)
  const lng = parseFloat(data[0]!.lon)
  if (!inBbox(lat, lng)) return null
  return { lat, lng, source: 'nominatim' }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const flags = parseFlags()
  const activities = loadActivities()
  const coords = loadCoords()

  // Dedup by location string so we only hit Nominatim once per place.
  const locationCache = new Map<string, CoordEntry | null>()

  let processed = 0
  let hits = 0
  let misses = 0
  let skipped = 0

  for (const a of activities) {
    if (flags.only && !flags.only.has(a.id)) {
      skipped++
      continue
    }
    if (!flags.force && coords[a.id] !== undefined) {
      // Already have an entry (could be null = previously failed). Skip
      // unless --force.
      skipped++
      continue
    }

    let entry: CoordEntry | null
    if (locationCache.has(a.location)) {
      entry = locationCache.get(a.location)!
    } else {
      console.log(`[${processed + 1}] ${a.id} — ${a.location}`)
      entry = await geocode(a.location)
      locationCache.set(a.location, entry)
      await sleep(THROTTLE_MS)
    }
    coords[a.id] = entry
    saveCoords(coords)
    if (entry) hits++
    else misses++
    processed++
  }

  console.log(`\nDone. Hits: ${hits}, Misses: ${misses}, Skipped: ${skipped}`)
  console.log(`Hand-curate misses in src/data/coords-overrides.json.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
