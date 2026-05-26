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
 *   npm run download:photos                 # resume, skip existing files
 *   npm run download:photos -- --force      # redownload everything
 *   npm run download:photos -- --only=a012  # only this activity
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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PHOTOS_JSON = resolve(ROOT, 'src/data/photos.json')
const PHOTOS_DIR = resolve(ROOT, 'public/photos')

const HERO_W = 800
const HERO_H = 1000
const THUMB_W = 400
const THUMB_H = 500
const MAX_CONCURRENT = 4
const RETRY_DELAY_MS = 2000
const MAX_RETRIES = 5

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(','))
  : null

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Rewrite a Pexels CDN URL to request a specific cropped size. */
function withSize(url: string, w: number, h: number): string {
  try {
    const u = new URL(url)
    u.searchParams.set('auto', 'compress')
    u.searchParams.set('cs', 'tinysrgb')
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('w', String(w))
    u.searchParams.set('h', String(h))
    return u.toString()
  } catch {
    return url
  }
}

async function downloadTo(url: string, dest: string): Promise<void> {
  let attempt = 0
  while (true) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, buf)
      return
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err
      attempt += 1
      const wait = RETRY_DELAY_MS * attempt
      console.warn(
        `  retry ${attempt}/${MAX_RETRIES} for ${dest.split('/').slice(-2).join('/')} in ${wait}ms (${(err as Error).message})`,
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
        while (true) {
          const idx = i++
          if (idx >= tasks.length) return
          await worker(tasks[idx]!)
        }
      })(),
    )
  }
  await Promise.all(workers)
}

function isLocalUrl(u: string): boolean {
  return u.startsWith('/photos/')
}

async function main(): Promise<void> {
  if (!existsSync(PHOTOS_JSON)) {
    console.error(`No photos.json at ${PHOTOS_JSON}. Run \`npm run fetch:photos\` first.`)
    process.exit(1)
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
      const sized = withSize(
        remoteUrl,
        isHero ? HERO_W : THUMB_W,
        isHero ? HERO_H : THUMB_H,
      )
      tasks.push({
        activityId,
        index: i + 1,
        remoteUrl: sized,
        localPath,
        localUrl,
      })
    }
  }

  // Save once now in case all entries were already local.
  writeFileSync(PHOTOS_JSON, JSON.stringify(photos, null, 2) + '\n', 'utf8')

  if (tasks.length === 0) {
    console.log('Nothing to download — everything is already local.')
    return
  }

  console.log(
    `${tasks.length} files to download (${Object.keys(photos).length} activities, ${MAX_CONCURRENT} parallel).`,
  )

  let done = 0
  let saveCounter = 0
  await runWithConcurrency(
    tasks,
    async (t) => {
      try {
        await downloadTo(t.remoteUrl, t.localPath)
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
