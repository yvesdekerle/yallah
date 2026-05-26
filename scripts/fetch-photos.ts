/**
 * Fetch 12 photo URLs per activity from the Pexels API and write them to
 * `src/data/photos.json`. The photos themselves stay on the Pexels CDN —
 * we only persist the URLs, which keeps the repo small.
 *
 * Usage:
 *   PEXELS_API_KEY=xxx npm run fetch:photos                                # fetch missing entries (safe pace)
 *   PEXELS_API_KEY=xxx npm run fetch:photos -- --force                     # refetch everything
 *   PEXELS_API_KEY=xxx npm run fetch:photos -- --only=a012,a045            # only these activities
 *   PEXELS_API_KEY=xxx npm run fetch:photos -- --throttle=300 --max=200    # fast batch (rolling 1h cap)
 *
 * Pexels free tier: 200 requests/hour on a **rolling window**. We do 1
 * search call per activity. Recommended workflow:
 *   1. Blast the first ~200 activities at full speed (throttle=300, max=200)
 *   2. Wait 1h
 *   3. Re-run the script with no args — it resumes the missing ones
 * Progress is saved to disk after every successful fetch, so the script is
 * always safe to interrupt and resume.
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
import { autoQuery } from './photo-query.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ACTIVITIES_PATH = resolve(ROOT, 'src/data/activities.json')
const PHOTOS_PATH = resolve(ROOT, 'src/data/photos.json')
const QUERIES_PATH = resolve(ROOT, 'scripts/photo-queries.json')

const PHOTOS_PER_ACTIVITY = 12
// 200 req/hour ≈ 1 request every 18s; default 19s keeps us safely below the
// rolling 1h cap. Override with --throttle=Nms (e.g. 300 for a fast batch).
const DEFAULT_THROTTLE_MS = 19_000

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
const throttleArg = process.argv.find((a) => a.startsWith('--throttle='))
const throttleMs = throttleArg
  ? Number.parseInt(throttleArg.slice('--throttle='.length), 10)
  : DEFAULT_THROTTLE_MS
const maxArg = process.argv.find((a) => a.startsWith('--max='))
const maxFetches = maxArg
  ? Number.parseInt(maxArg.slice('--max='.length), 10)
  : Infinity

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

async function searchPexels(
  query: string,
  perPage = PHOTOS_PER_ACTIVITY,
): Promise<PexelsPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`
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

/**
 * Fetch up to 12 photos for one activity with a single Pexels search.
 * If Pexels returns fewer than 12 photos, we keep what we have — the
 * carousel naturally shrinks. No fallback / padding.
 */
async function fetchForActivity(
  activity: Activity,
  customQuery?: string,
): Promise<{ urls: string[]; query: string }> {
  const query = customQuery ?? autoQuery(activity)
  const results = await searchPexels(query, PHOTOS_PER_ACTIVITY)
  const urls = results.map((p) => p.src.large)
  return { urls, query }
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

  const batchSize = Math.min(todo.length, maxFetches)
  console.log(
    `${activities.length} activities, ${todo.length} to fetch ` +
      `(${force ? 'force' : 'skipping existing'}), ` +
      `processing ${batchSize}, throttle=${throttleMs}ms.`,
  )
  if (batchSize === 0) {
    console.log('Nothing to do.')
    return
  }

  let done = 0
  for (let i = 0; i < todo.length && done < maxFetches; i++) {
    const a = todo[i]!
    const custom = queries[a.id]
    process.stdout.write(`[${done + 1}/${batchSize}] ${a.id} ... `)
    try {
      const { urls, query } = await fetchForActivity(a, custom)
      if (urls.length === 0) {
        console.log(`NO RESULTS for "${query}"`)
      } else {
        photos[a.id] = urls
        saveJson(PHOTOS_PATH, photos)
        console.log(`${urls.length} photos ✓  "${query}"`)
      }
      done += 1
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`)
    }
    if (done < maxFetches && i < todo.length - 1) {
      await sleep(throttleMs)
    }
  }

  const remaining = todo.length - done
  console.log(`\nDone. ${done} fetched, ${remaining} still pending.`)
  if (remaining > 0) {
    console.log(`Wait an hour, then re-run \`npm run fetch:photos\` to finish.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
