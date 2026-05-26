/**
 * Fetch 12 photo URLs per activity from the Pexels API and write them to
 * `src/data/photos.json`. The photos themselves stay on the Pexels CDN —
 * we only persist the URLs, which keeps the repo small.
 *
 * Usage:
 *   PEXELS_API_KEY=xxx npm run fetch:photos          # fetch missing entries
 *   PEXELS_API_KEY=xxx npm run fetch:photos -- --force  # refetch everything
 *   PEXELS_API_KEY=xxx npm run fetch:photos -- --only a012,a045  # only these
 *
 * Pexels free tier allows 200 requests/hour. We do 1 search call per
 * activity (with `per_page=15`), so 201 activities ≈ 1h with throttling.
 * The script saves progress to disk after every fetch — safe to interrupt
 * and resume.
 *
 * Manual override per activity: edit `scripts/photo-queries.json`, e.g.
 *   { "a012": "catamaran sunset mauritius" }
 * The script picks this up automatically.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Activity } from '../src/types/activity.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ACTIVITIES_PATH = resolve(ROOT, 'src/data/activities.json')
const PHOTOS_PATH = resolve(ROOT, 'src/data/photos.json')
const QUERIES_PATH = resolve(ROOT, 'scripts/photo-queries.json')

const PHOTOS_PER_ACTIVITY = 12
// 200 req/hour ≈ 1 request every 18s; we sleep 19s to stay safely below.
const THROTTLE_MS = 19_000

const PEXELS_KEY = process.env.PEXELS_API_KEY
if (!PEXELS_KEY) {
  console.error('Set the PEXELS_API_KEY environment variable.')
  console.error('Get one (free) at https://www.pexels.com/api/')
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(','))
  : null

// Category → secondary keyword. Helps Pexels narrow down a generic activity
// title to the right vibe.
const CATEGORY_HINTS: Record<string, string> = {
  '🌊 Mer & Sports nautiques': 'ocean tropical',
  '🏝️ Îles, Lagons & Excursions bateau': 'tropical island lagoon',
  '🐅 Faune & Rencontres animales': 'wildlife tropical',
  '🏔️ Randonnée & Sommets': 'mountain hiking',
  '🌳 Terre & Nature': 'jungle nature',
  '✈️ Activités aériennes': 'aerial helicopter sky',
  '🍽️ Gastronomie & Spiritueux': 'food restaurant',
  '🏛️ Culture, Histoire & Mémoire': 'heritage colonial',
  '🛍️ Marchés & Artisanat': 'market crafts',
  '🧘 Bien-être & Détente': 'spa wellness beach',
  '🎢 Sensations fortes': 'adventure adrenaline',
}

const STOPWORDS = new Set([
  'à', 'a', 'au', 'aux', 'avec', 'dans', 'de', 'des', 'du', 'en', 'et',
  'la', 'le', 'les', 'ou', 'par', 'pour', 'sans', 'sous', 'sur', 'un',
  'une', 'à la', 'd', 'l', 'aux',
])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function autoQuery(a: Activity): string {
  // Strip the place name in parens, sentinel emojis, numbers.
  const cleanTitle = a.title
    .replace(/\([^)]*\)/g, '')
    .replace(/\u{1F48E}/gu, '') // 💎
    .replace(/\u{1F5DD}/gu, '') // 🗝️ base
    .replace(/️/g, '') // emoji variation selector
    .replace(/·/g, '')
    .replace(/\d+/g, '')
    .trim()

  const words = stripAccents(cleanTitle)
    .toLowerCase()
    .split(/[\s,'/-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 3)

  const hint = CATEGORY_HINTS[a.category] ?? 'tropical'
  return `${words.join(' ')} ${hint}`.trim()
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  src: { large2x: string; large: string; medium: string; small: string }
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
  total_results: number
}

async function searchPexels(query: string): Promise<PexelsPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PHOTOS_PER_ACTIVITY}&orientation=portrait`
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_KEY! },
    })
    if (res.status === 429) {
      const backoff = 60_000 * attempt
      console.warn(`  ⚠ rate-limited, sleeping ${backoff / 1000}s...`)
      await sleep(backoff)
      continue
    }
    if (!res.ok) throw new Error(`Pexels API ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as PexelsSearchResponse
    return data.photos
  }
  throw new Error('Exceeded retry attempts')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function saveJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

async function main(): Promise<void> {
  const activities = JSON.parse(
    readFileSync(ACTIVITIES_PATH, 'utf8'),
  ) as Activity[]
  const photos = loadJson<Record<string, string[]>>(PHOTOS_PATH, {})
  const queries = loadJson<Record<string, string>>(QUERIES_PATH, {})

  const todo = activities.filter((a) => {
    if (onlyIds && !onlyIds.has(a.id)) return false
    if (force) return true
    return !photos[a.id] || photos[a.id]!.length < PHOTOS_PER_ACTIVITY
  })

  console.log(
    `${activities.length} activities, ${todo.length} to fetch ` +
      `(${force ? 'force' : 'skipping existing'}).`,
  )
  if (todo.length === 0) {
    console.log('Nothing to do.')
    return
  }

  for (let i = 0; i < todo.length; i++) {
    const a = todo[i]!
    const query = queries[a.id] ?? autoQuery(a)
    process.stdout.write(`[${i + 1}/${todo.length}] ${a.id} "${query}" ... `)
    try {
      const results = await searchPexels(query)
      const urls = results.slice(0, PHOTOS_PER_ACTIVITY).map((p) => p.src.large)
      if (urls.length === 0) {
        console.log('NO RESULTS')
      } else {
        photos[a.id] = urls
        saveJson(PHOTOS_PATH, photos)
        console.log(`${urls.length} photos ✓`)
      }
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`)
    }
    if (i < todo.length - 1) {
      await sleep(THROTTLE_MS)
    }
  }

  console.log(`\nDone. Wrote ${PHOTOS_PATH}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
