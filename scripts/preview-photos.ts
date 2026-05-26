/**
 * Generate a single self-contained HTML page that previews every activity's
 * photos in a grid. Open the file in any browser, no server needed.
 *
 *   npm run preview:photos
 *
 * Useful to spot activities where Pexels returned irrelevant photos so you
 * can override their query in `scripts/photo-queries.json` and re-fetch.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import type { Activity } from '../src/types/activity.ts'
import { autoQuery } from './photo-query.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ACTIVITIES_PATH = resolve(ROOT, 'src/data/activities.json')
const PHOTOS_PATH = resolve(ROOT, 'src/data/photos.json')
const QUERIES_PATH = resolve(ROOT, 'scripts/photo-queries.json')
const OUTPUT_PATH = resolve(ROOT, 'preview-photos.html')

const args = process.argv.slice(2)
const autoOpen = !args.includes('--no-open')

function loadJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Note: we deliberately do NOT override Pexels' default size params here.
// The URLs in photos.json already point at a pre-processed 940x650 large
// version that's CDN-cached. Adding our own w/h/fit forces Pexels to
// re-process the image on every request and tends to trigger 503s /
// concurrency_exceeded under load. The browser scales the larger image
// down to the 240×240 grid cell visually, no big deal for bandwidth on
// a debug page.

function buildHtml(
  activities: Activity[],
  photos: Record<string, string[]>,
  queries: Record<string, string>,
): string {
  const totalPhotos = Object.values(photos).reduce(
    (sum, urls) => sum + urls.length,
    0,
  )
  const populated = activities.filter((a) => photos[a.id]?.length).length
  const empty = activities.length - populated

  const sections = activities
    .map((a) => {
      const urls = photos[a.id] ?? []
      const customQuery = queries[a.id]
      const usedQuery = customQuery ?? autoQuery(a)
      const queryTag = customQuery ? '🔧 custom' : '🤖 auto'
      const status =
        urls.length === 0
          ? '<span class="no-photos">aucune photo</span>'
          : urls.length < 12
            ? `<span class="warn">${urls.length} / 12</span>`
            : `<span class="ok">12 / 12</span>`

      const grid = urls.length
        ? urls
            .map(
              (u, i) => `
        <a href="${escapeHtml(u)}" target="_blank" rel="noopener" title="photo ${i + 1}">
          <img data-src="${escapeHtml(u)}" alt="" />
        </a>`,
            )
            .join('')
        : '<div class="empty">Aucune photo récupérée pour cette activité.</div>'

      return `
  <section id="${a.id}" class="activity${a.pepite ? ' pepite' : ''}">
    <div class="header">
      <h2>
        <span class="num">N°${a.number.toString().padStart(3, '0')}</span>
        ${escapeHtml(a.title)}
        ${a.pepite ? '<span class="badge gem">💎 pépite</span>' : ''}
        ${a.secret ? '<span class="badge secret">🗝️ secret</span>' : ''}
      </h2>
      <div class="meta">
        <span class="cat">${escapeHtml(a.category)}</span>
        <span class="dot">·</span>
        <span class="loc">${escapeHtml(a.location)}</span>
      </div>
      <div class="query-row">
        <code>${escapeHtml(usedQuery)}</code>
        <span class="query-tag">${queryTag}</span>
        <span class="status">${status}</span>
      </div>
    </div>
    <div class="grid">${grid}</div>
  </section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yallah — Aperçu photos</title>
  <style>
    :root {
      --sun: #FFCB45;
      --coral: #FF6B47;
      --ink: #181B1F;
      --ink2: #3A3D44;
      --muted: #7A7B85;
      --paper: #FFFCF5;
      --sand: #F4EFE5;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.45;
    }
    header.top {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--sun);
      padding: 18px 22px;
      box-shadow: 0 2px 12px rgba(20, 30, 50, 0.12);
    }
    header.top h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
    header.top h1 .dot { color: var(--coral); }
    header.top .stats {
      margin-top: 6px;
      font-size: 13px;
      color: var(--ink2);
    }
    header.top .stats strong { color: var(--ink); }
    main { padding: 0; max-width: 1280px; margin: 0 auto; }
    .activity {
      background: #fff;
      margin: 12px 16px;
      padding: 16px 18px;
      border-radius: 14px;
      box-shadow: 0 2px 10px -3px rgba(20, 30, 50, 0.1);
    }
    .activity.pepite { border-left: 4px solid var(--sun); }
    .activity h2 {
      margin: 0 0 4px;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .num {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      background: var(--sand);
      color: var(--ink);
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.4px;
    }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 99px;
      font-weight: 600;
    }
    .badge.gem { background: linear-gradient(135deg, var(--sun), var(--coral)); color: #fff; }
    .badge.secret { background: var(--ink); color: #fff; }
    .meta { font-size: 12.5px; color: var(--muted); margin-bottom: 10px; }
    .meta .dot { margin: 0 4px; opacity: 0.5; }
    .query-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .query-row code {
      font-family: ui-monospace, "JetBrains Mono", monospace;
      background: var(--sand);
      padding: 4px 10px;
      border-radius: 6px;
      color: var(--ink);
      font-size: 12px;
    }
    .query-tag { color: var(--muted); }
    .status { margin-left: auto; font-weight: 600; }
    .status .ok { color: #22C268; }
    .status .warn { color: #FF8A00; }
    .status .no-photos { color: var(--coral); font-style: italic; font-weight: 500; }
    .grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 540px) {
      .grid { grid-template-columns: repeat(3, 1fr); }
    }
    .grid a {
      display: block;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      background: var(--sand);
    }
    .grid img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.15s, opacity 0.2s;
      background: linear-gradient(135deg, #f0ecde 0%, #e8e3d2 50%, #f0ecde 100%);
      background-size: 200% 200%;
      opacity: 0;
    }
    .grid img.loaded { opacity: 1; }
    .grid img.failed {
      opacity: 1;
      background: #fde0d8;
    }
    .grid a:hover img { transform: scale(1.03); }
    .grid a.failed { cursor: pointer; position: relative; }
    .grid a.failed::after {
      content: "↻ retry";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
      color: var(--coral);
      background: rgba(255, 224, 216, 0.75);
      border-radius: 8px;
      pointer-events: none;
    }
    .grid a.retrying::after { content: "..."; color: var(--ink2); }
    #progress {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(20, 30, 50, 0.92);
      color: #fff;
      padding: 8px 14px;
      border-radius: 99px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #progress.done { opacity: 0; transition: opacity 0.4s 1s; pointer-events: none; }
    #progress button {
      background: var(--coral);
      color: #fff;
      border: 0;
      border-radius: 99px;
      padding: 4px 12px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    #progress button:disabled { opacity: 0.4; cursor: default; }
    .empty {
      padding: 24px;
      background: var(--sand);
      border-radius: 8px;
      color: var(--muted);
      font-style: italic;
      text-align: center;
    }
  </style>
</head>
<body>
  <header class="top">
    <h1>yallah<span class="dot">.</span> aperçu photos</h1>
    <div class="stats">
      <strong>${activities.length}</strong> activités ·
      <strong>${populated}</strong> avec photos ·
      <strong>${empty}</strong> vides ·
      <strong>${totalPhotos}</strong> photos au total
    </div>
  </header>
  <main>${sections}
  </main>
  <div id="progress">
    <span id="progress-text">0 / 0</span>
    <button id="retry-all" hidden>↻ retry échecs</button>
  </div>
  <script>
    // Lazy-load + bounded-concurrency image queue. Avoids Pexels'
    // concurrency_exceeded errors when the page first opens.
    (function () {
      const MAX_CONCURRENT = 2
      const RETRY_DELAY_MS = 2000
      const MAX_RETRIES = 6
      const imgs = Array.from(document.querySelectorAll('img[data-src]'))
      const total = imgs.length
      let loaded = 0
      let failed = 0
      let inFlight = 0
      const queue = []
      const failedImgs = new Set()
      const progressText = document.getElementById('progress-text')
      const retryAllBtn = document.getElementById('retry-all')
      const progress = document.getElementById('progress')

      function updateProgress() {
        const done = loaded + failed
        let text = done + ' / ' + total + ' photos'
        if (failed > 0) text += ' (' + failed + ' échecs)'
        progressText.textContent = text
        retryAllBtn.hidden = failed === 0
        if (done >= total && failed === 0) progress.classList.add('done')
        else progress.classList.remove('done')
      }

      function markFailed(img) {
        img.classList.add('failed')
        img.alt = '(échec)'
        const link = img.closest('a')
        if (link) {
          link.classList.add('failed')
          link.addEventListener('click', onRetryClick, { once: true })
        }
        failedImgs.add(img)
        failed += 1
      }

      function clearFailed(img) {
        img.classList.remove('failed')
        const link = img.closest('a')
        if (link) link.classList.remove('failed', 'retrying')
        failedImgs.delete(img)
        failed -= 1
      }

      function onRetryClick(e) {
        e.preventDefault()
        const link = e.currentTarget
        const img = link.querySelector('img')
        if (!img || !failedImgs.has(img)) return
        link.classList.add('retrying')
        link.classList.remove('failed')
        clearFailed(img)
        updateProgress()
        queue.push(img)
        pump()
      }

      function pump() {
        while (inFlight < MAX_CONCURRENT && queue.length > 0) {
          const img = queue.shift()
          inFlight += 1
          let attempt = 0
          const tryLoad = () => {
            img.onload = () => {
              img.classList.add('loaded')
              inFlight -= 1
              loaded += 1
              updateProgress()
              pump()
            }
            img.onerror = () => {
              if (attempt < MAX_RETRIES) {
                attempt += 1
                // Exponential-ish backoff: 1.5s, 3s, 4.5s, 6s, 7.5s
                setTimeout(tryLoad, RETRY_DELAY_MS * attempt)
              } else {
                markFailed(img)
                inFlight -= 1
                updateProgress()
                pump()
              }
            }
            // Force fresh load — break any stale cache state from a previous attempt.
            img.src = ''
            img.src = img.dataset.src
          }
          tryLoad()
        }
      }

      retryAllBtn.addEventListener('click', () => {
        const toRetry = Array.from(failedImgs)
        toRetry.forEach((img) => clearFailed(img))
        updateProgress()
        toRetry.forEach((img) => queue.push(img))
        pump()
      })

      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && e.target.dataset.src) {
              observer.unobserve(e.target)
              queue.push(e.target)
              pump()
            }
          }
        },
        { rootMargin: '400px' },
      )
      imgs.forEach((img) => observer.observe(img))
      updateProgress()
    })()
  </script>
</body>
</html>
`
}

function main(): void {
  const activities = loadJson<Activity[]>(ACTIVITIES_PATH, [])
  const photos = loadJson<Record<string, string[]>>(PHOTOS_PATH, {})
  const queries = loadJson<Record<string, string>>(QUERIES_PATH, {})
  const html = buildHtml(activities, photos, queries)
  writeFileSync(OUTPUT_PATH, html, 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
  console.log(`  ${activities.length} activities, ${Object.keys(photos).length} populated.`)
  if (autoOpen && process.platform === 'darwin') {
    try {
      execSync(`open ${OUTPUT_PATH}`)
    } catch {
      // ignore — user can open manually
    }
  }
}

main()
