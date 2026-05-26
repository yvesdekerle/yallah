/**
 * Download every photo referenced in `src/data/photos.json` to
 * `public/photos/aXXX/N.jpg` and rewrite the JSON to point at the local
 * paths. After running this, the app + preview no longer depend on the
 * Pexels CDN at runtime — everything is served by Vercel's edge.
 *
 * Sizes:
 *   - Photo 1 (hero): 800 wide × 1000 tall, ~80 KB
 *   - Photos 2-12 (carousel): 400 × 500, ~25 KB
 *   - Total budget for 201 × 12 = ~70 MB on disk
 *
 * Usage:
 *   npm run download:photos                  # safe default (1 req/1.2s, ~50/min)
 *   npm run download:photos -- --probe       # test if Pexels is throttling us
 *   npm run download:photos -- --fast        # 2 parallel × 500ms (risks 429s)
 *   npm run download:photos -- --force       # redownload everything
 *   npm run download:photos -- --only=a012   # only this activity
 *   npm run download:photos -- --delay=10m   # wait 10 min before starting
 *                                            # (also: 600s, 1h, or plain int = minutes)
 *
 * Safe to interrupt and resume — each successful download is committed
 * to disk + photos.json immediately.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PHOTOS_JSON = resolve(ROOT, 'src/data/photos.json')
const PHOTOS_DIR = resolve(ROOT, 'public/photos')

const HERO_W = 800
const HERO_H = 1000
const THUMB_W = 400
const THUMB_H = 500
const JPEG_QUALITY = 78
// Pexels' CDN appears to allow ~50-100 req/min sustained from a single
// IP. Sending faster than that triggers a long 60s+ throttle (the
// previous "burst then wait" pattern was net-slower than going steady).
// 1 worker × 1.2s/req = 50 req/min — comfortably below the limit, no
// 429s expected. Total run ≈ 50 minutes for 2400 files.
// Pass --fast to bring back the parallel mode if Pexels is feeling generous.
const SLOW_CONCURRENT = 1
const SLOW_INTER_REQUEST_MS = 1200
const FAST_CONCURRENT = 2
const FAST_INTER_REQUEST_MS = 500
const RETRY_DELAY_MS = 3000
const MAX_RETRIES = 8
const DEFAULT_429_PAUSE_MS = 60_000

// Browser-ish UA so the request doesn't look like a bot scraper.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

// Shared "paused until" timestamp — when any worker takes a 429, every
// other worker waits past this point before its next request.
let pausedUntil = 0
// Consecutive 429s (reset by any successful download). When we keep
// taking 429s in a row, double the pause to give Pexels real breathing
// room instead of pestering them every 60s.
let consecutivePauses = 0
const MAX_PAUSE_MS = 30 * 60 * 1000 // cap at 30 min

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const probeMode = args.has('--probe')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(','))
  : null
const fastMode = args.has('--fast')
const MAX_CONCURRENT = fastMode ? FAST_CONCURRENT : SLOW_CONCURRENT
const INTER_REQUEST_MS = fastMode ? FAST_INTER_REQUEST_MS : SLOW_INTER_REQUEST_MS
const delayArg = process.argv.find((a) => a.startsWith('--delay='))
// Accepts `--delay=10` (minutes) or `--delay=10m` / `--delay=600s` / `--delay=1h`
function parseDelayMs(raw: string | undefined): number {
  if (!raw) return 0
  const m = raw.match(/^(\d+)([smh]?)$/)
  if (!m) return 0
  const n = Number.parseInt(m[1]!, 10)
  switch (m[2]) {
    case 's': return n * 1000
    case 'h': return n * 60 * 60 * 1000
    case 'm':
    default: return n * 60 * 1000
  }
}
const delayMs = parseDelayMs(delayArg?.slice('--delay='.length))

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForPauseClear(): Promise<void> {
  while (true) {
    const now = Date.now()
    if (now >= pausedUntil) return
    await sleep(pausedUntil - now)
  }
}

function setPauseFromHeader(res: Response): number {
  // Pexels (and most CDNs) send `Retry-After` in seconds.
  const ra = res.headers.get('Retry-After')
  const seconds = ra ? Number.parseInt(ra, 10) : NaN
  const headerMs = Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : DEFAULT_429_PAUSE_MS

  consecutivePauses += 1
  // Exponential bump: 1st pause = headerMs, 2nd = ×2, 3rd = ×4, ... capped.
  const multiplier = Math.min(2 ** (consecutivePauses - 1), 32)
  const pauseMs = Math.min(headerMs * multiplier, MAX_PAUSE_MS)
  const newPausedUntil = Date.now() + pauseMs
  if (newPausedUntil > pausedUntil) pausedUntil = newPausedUntil
  return pauseMs
}

/**
 * Download a Pexels image AT ITS PRE-CACHED SIZE (no custom w/h params
 * that trigger their on-demand processor) and resize locally with sharp.
 * Saves a JPEG at the target size + quality.
 *
 * Honors a shared `pausedUntil` so when any worker hits 429, every other
 * worker stops hammering the CDN until Pexels says we can resume.
 */
async function downloadAndResize(
  url: string,
  dest: string,
  width: number,
  height: number,
): Promise<void> {
  let attempt = 0
  while (true) {
    await waitForPauseClear()
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/jpeg,*/*',
          Referer: 'https://www.pexels.com/',
        },
      })
      if (res.status === 429) {
        const pauseMs = setPauseFromHeader(res)
        console.warn(
          `\n  ⏳ Pexels CDN throttled — pausing all workers for ${Math.round(pauseMs / 1000)}s`,
        )
        // Retry this file once the pause clears (counts as 1 attempt).
        attempt += 1
        if (attempt >= MAX_RETRIES) throw new Error(`HTTP 429 after ${MAX_RETRIES} retries`)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      mkdirSync(dirname(dest), { recursive: true })
      await sharp(buf)
        .resize(width, height, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(dest)
      // A clean download means Pexels is happy again — reset the backoff
      // ladder so the next 429 (if any) starts fresh at the minimum pause.
      consecutivePauses = 0
      return
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err
      attempt += 1
      const wait = RETRY_DELAY_MS * attempt
      console.warn(
        `\n  retry ${attempt}/${MAX_RETRIES} for ${dest.split('/').slice(-2).join('/')} in ${wait}ms (${(err as Error).message})`,
      )
      await sleep(wait)
    }
  }
}

interface Task {
  activityId: string
  index: number // 1..12
  remoteUrl: string
  localPath: string
  localUrl: string
  width: number
  height: number
}

async function runWithConcurrency(
  tasks: Task[],
  worker: (t: Task) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let i = 0
  const workers: Promise<void>[] = []
  for (let c = 0; c < concurrency; c++) {
    workers.push(
      (async () => {
        // Light per-worker offset so they don't fire in lockstep.
        await sleep(c * 200)
        while (true) {
          const idx = i++
          if (idx >= tasks.length) return
          await worker(tasks[idx]!)
          // Inter-request breath inside each worker.
          await sleep(INTER_REQUEST_MS)
        }
      })(),
    )
  }
  await Promise.all(workers)
}

function isLocalUrl(u: string): boolean {
  return u.startsWith('/photos/')
}

async function probe(): Promise<void> {
  const photos: Record<string, string[]> = JSON.parse(
    readFileSync(PHOTOS_JSON, 'utf8'),
  )
  let url: string | null = null
  for (const urls of Object.values(photos)) {
    for (const u of urls) {
      if (!u.startsWith('/photos/')) {
        url = u
        break
      }
    }
    if (url) break
  }
  if (!url) {
    console.log('All photos in photos.json are already local — nothing left to probe.')
    return
  }
  console.log(`Probing Pexels with: ${url}\n`)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/jpeg,*/*',
        Referer: 'https://www.pexels.com/',
        Range: 'bytes=0-0', // only ask for 1 byte to keep it light
      },
    })
    console.log(`Status: ${res.status} ${res.statusText}`)
    const ra = res.headers.get('Retry-After')
    const rl = res.headers.get('X-Ratelimit-Remaining')
    if (ra) console.log(`Retry-After: ${ra}s`)
    if (rl) console.log(`X-Ratelimit-Remaining: ${rl}`)
    if (res.status === 200 || res.status === 206) {
      console.log('\n✓ Quota OK — you can run `npm run download:photos` now.')
    } else if (res.status === 429) {
      const seconds = ra ? Number.parseInt(ra, 10) : 60
      const min = Math.ceil(seconds / 60)
      console.log(
        `\n✗ Still throttled — wait at least ${min} min, then re-run --probe.`,
      )
      console.log(
        `  Or queue the download for after the cooldown:`,
      )
      console.log(`    npm run download:photos -- --delay=${min}m`)
    } else {
      console.log(`\n? Unexpected status ${res.status}.`)
    }
  } catch (err) {
    console.log(`Network error: ${(err as Error).message}`)
  }
}

async function main(): Promise<void> {
  if (!existsSync(PHOTOS_JSON)) {
    console.error(`No photos.json at ${PHOTOS_JSON}. Run \`npm run fetch:photos\` first.`)
    process.exit(1)
  }

  if (probeMode) {
    await probe()
    return
  }

  if (delayMs > 0) {
    const mins = Math.round(delayMs / 60_000)
    const startTime = new Date(Date.now() + delayMs)
    console.log(
      `⏳ Waiting ${mins}min before starting (will resume around ${startTime.toLocaleTimeString()})...`,
    )
    await sleep(delayMs)
  }

  const photos: Record<string, string[]> = JSON.parse(
    readFileSync(PHOTOS_JSON, 'utf8'),
  )

  // Build the task list.
  const tasks: Task[] = []
  for (const [activityId, urls] of Object.entries(photos)) {
    if (onlyIds && !onlyIds.has(activityId)) continue
    for (let i = 0; i < urls.length; i++) {
      const remoteUrl = urls[i]!
      // Skip entries that are already local paths (resumed run).
      if (!force && isLocalUrl(remoteUrl)) continue
      const localFile = `${i + 1}.jpg`
      const localPath = resolve(PHOTOS_DIR, activityId, localFile)
      const localUrl = `/photos/${activityId}/${localFile}`
      // Skip files we already have on disk.
      if (!force && existsSync(localPath)) {
        photos[activityId]![i] = localUrl
        continue
      }
      const isHero = i === 0
      tasks.push({
        activityId,
        index: i + 1,
        remoteUrl, // download Pexels' pre-cached src.large as-is
        localPath,
        localUrl,
        width: isHero ? HERO_W : THUMB_W,
        height: isHero ? HERO_H : THUMB_H,
      })
    }
  }

  // Save once now in case all entries were already local.
  writeFileSync(PHOTOS_JSON, JSON.stringify(photos, null, 2) + '\n', 'utf8')

  if (tasks.length === 0) {
    console.log('Nothing to download — everything is already local.')
    return
  }

  const reqPerSec = MAX_CONCURRENT * (1000 / INTER_REQUEST_MS)
  const etaMin = Math.round(tasks.length / reqPerSec / 60)
  console.log(
    `${tasks.length} files to download — ${MAX_CONCURRENT} worker(s), ${INTER_REQUEST_MS}ms between requests` +
      (fastMode ? ' (--fast)' : '') +
      `\nEstimated ~${etaMin} min if Pexels cooperates (longer if we hit 429s).`,
  )

  let done = 0
  let saveCounter = 0
  await runWithConcurrency(
    tasks,
    async (t) => {
      try {
        await downloadAndResize(t.remoteUrl, t.localPath, t.width, t.height)
        photos[t.activityId]![t.index - 1] = t.localUrl
        done += 1
        saveCounter += 1
        // Persist every 10 downloads to keep the snapshot fresh.
        if (saveCounter >= 10) {
          saveCounter = 0
          writeFileSync(
            PHOTOS_JSON,
            JSON.stringify(photos, null, 2) + '\n',
            'utf8',
          )
        }
        process.stdout.write(
          `\r[${done}/${tasks.length}] ${t.activityId}/${t.index}.jpg`,
        )
      } catch (err) {
        console.log(
          `\n  ✗ ${t.activityId}/${t.index}.jpg — ${(err as Error).message}`,
        )
      }
    },
    MAX_CONCURRENT,
  )

  // Final save.
  writeFileSync(PHOTOS_JSON, JSON.stringify(photos, null, 2) + '\n', 'utf8')
  console.log(`\nDone. ${done}/${tasks.length} downloaded.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
