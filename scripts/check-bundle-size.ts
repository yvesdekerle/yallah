import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export interface Chunk {
  name: string
  gzipKB: number
}
export interface Budgets {
  mainKB: number
  lazyKB: number
  dataKB: number
}
export interface Violation extends Chunk {
  budgetKB: number
  kind: 'main' | 'lazy' | 'data'
}

// Classify chunks by Vite's DEFAULT naming (vite.config.ts sets no
// `manualChunks`/`chunkFileNames`): the entry is `index-[hash].js`;
// `TileLayer-[hash].js` is the Leaflet vendor chunk — a fixed third-party cost
// that's lazy-loaded, so it's EXCLUDED from the budget; `activities-[hash].js`
// is the code-split curated dataset, judged against its own (larger) data
// budget; everything else is a lazy route/feature chunk.
export function evaluateBundle(chunks: Chunk[], budgets: Budgets): Violation[] {
  const violations: Violation[] = []
  for (const c of chunks) {
    if (c.name.startsWith('TileLayer-')) continue // Leaflet vendor — excluded
    if (c.name.startsWith('firebase-')) continue // Firebase vendor — excluded
    if (c.name.startsWith('index-')) {
      if (c.gzipKB > budgets.mainKB) {
        violations.push({ ...c, budgetKB: budgets.mainKB, kind: 'main' })
      }
    } else if (c.name.startsWith('activities-')) {
      // Code-split curated dataset (lazy, loaded behind the splash). It's a
      // data payload, not a route/feature code chunk — hence its own budget.
      if (c.gzipKB > budgets.dataKB) {
        violations.push({ ...c, budgetKB: budgets.dataKB, kind: 'data' })
      }
    } else if (c.gzipKB > budgets.lazyKB) {
      violations.push({ ...c, budgetKB: budgets.lazyKB, kind: 'lazy' })
    }
  }
  return violations
}

// Leaflet ships runtime DOM class literals (`leaflet-pane`, `leaflet-container`,
// `leaflet-zoom-*`, …) that survive minification — a reliable fingerprint for
// "Leaflet's code is in THIS chunk". The map UI (DetailModal mini-map +
// FullscreenMap) is `React.lazy`'d, so Leaflet must live ONLY in its own vendor
// chunk and NEVER in the eager entry (`index-*`); a leak would drag ~43 kB gzip
// into first paint. The size budget alone can't catch a partial leak that stays
// under `mainKB`, so this content guard backstops PERF-06.
const LEAFLET_FINGERPRINT = /leaflet-(?:pane|container|zoom|tile|map-pane)/

export interface NamedCode {
  name: string
  code: string
}
export interface LeafletAudit {
  /** Name of an eager `index-*` chunk containing Leaflet, or `null` if clean. */
  leak: string | null
  /** Whether ANY chunk carries the fingerprint (guards against a stale regex). */
  vendorFound: boolean
}

export function auditLeaflet(chunks: NamedCode[]): LeafletAudit {
  let leak: string | null = null
  let vendorFound = false
  for (const c of chunks) {
    if (!LEAFLET_FINGERPRINT.test(c.code)) continue
    vendorFound = true
    if (c.name.startsWith('index-')) leak = c.name
  }
  return { leak, vendorFound }
}

// The Firebase SDK bakes its API hosts into the bundle as string literals that
// survive minification — a reliable fingerprint for "Firebase code is in THIS
// chunk". Auth + Firestore are reached ONLY through a dynamic import
// (services/firebase/client.ts via api.ts), so Firebase must live in its own
// `firebase-*` vendor chunk and NEVER in the eager `index-*` entry; a leak would
// drag the (large) SDK into first paint.
const FIREBASE_FINGERPRINT = /(?:firestore|identitytoolkit)\.googleapis\.com/

export function auditFirebase(chunks: NamedCode[]): LeafletAudit {
  let leak: string | null = null
  let vendorFound = false
  for (const c of chunks) {
    if (!FIREBASE_FINGERPRINT.test(c.code)) continue
    vendorFound = true
    if (c.name.startsWith('index-')) leak = c.name
  }
  return { leak, vendorFound }
}

// Budgets are measured against this script's `gzipSync(level 9)` output, which
// runs ~4 kB below Vite's build-log gzip number (different compressor effort).
// THIS number is the source of truth — ignore the Vite log for the budget.
// `mainKB` lowered from 135 → 105 after code-splitting activities.json out of
// the entry (measured ~98 kB gzip here); locks the ~28 kB gain. `dataKB` (40)
// gives the curated dataset (~28 kB gzip / 198 activities) room to grow before
// it needs paginating.
const BUDGETS: Budgets = { mainKB: 105, lazyKB: 15, dataKB: 40 }
const ASSETS_DIR = 'dist/assets'

function kindOf(name: string): string {
  if (name.startsWith('TileLayer-')) return 'leaflet(skip)'
  if (name.startsWith('firebase-')) return 'firebase(skip)'
  if (name.startsWith('index-')) return 'main'
  if (name.startsWith('activities-')) return 'data'
  return 'lazy'
}

function main(): void {
  let files: string[]
  try {
    files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'))
  } catch {
    console.error(`✗ ${ASSETS_DIR} not found — run \`npm run build\` first.`)
    process.exit(1)
  }
  const chunks = files.map((name) => {
    const buf = readFileSync(join(ASSETS_DIR, name))
    return {
      name,
      gzipKB: gzipSync(buf, { level: 9 }).length / 1024,
      code: buf.toString('utf8'),
    }
  })

  // Guard against a silent no-op pass: a real build always has an entry chunk.
  if (!chunks.some((c) => c.name.startsWith('index-'))) {
    console.error('✗ no entry chunk (index-*.js) in dist/assets — build output looks wrong.')
    process.exit(1)
  }

  for (const c of [...chunks].sort((a, b) => b.gzipKB - a.gzipKB)) {
    console.log(`  ${c.gzipKB.toFixed(1).padStart(7)} kB  ${kindOf(c.name).padEnd(13)} ${c.name}`)
  }

  const audit = auditLeaflet(chunks)
  if (!audit.vendorFound) {
    console.error(
      '\n✗ no Leaflet vendor chunk detected — the fingerprint may be stale (Leaflet ' +
        'upgrade renamed its classes?) or the maps feature was removed. Update the ' +
        'guard in scripts/check-bundle-size.ts.',
    )
    process.exit(1)
  }
  if (audit.leak !== null) {
    console.error(
      `\n✗ Leaflet leaked into the eager entry chunk (${audit.leak}) — it must stay ` +
        'lazy-only. A map component is likely imported statically instead of via React.lazy.',
    )
    process.exit(1)
  }

  const fb = auditFirebase(chunks)
  if (fb.leak !== null) {
    console.error(
      `\n✗ Firebase leaked into the eager entry chunk (${fb.leak}) — it must stay ` +
        'lazy-only. Something imports services/firebase/client.ts statically instead ' +
        'of via the dynamic-import facade (services/firebase/api.ts).',
    )
    process.exit(1)
  }

  const violations = evaluateBundle(chunks, BUDGETS)
  if (violations.length > 0) {
    console.error('\n✗ bundle budget exceeded:')
    for (const v of violations) {
      console.error(`  ${v.name}: ${v.gzipKB.toFixed(1)} kB > ${v.budgetKB} kB (${v.kind})`)
    }
    process.exit(1)
  }
  console.log(
    `\n✓ bundle within budget (main ≤ ${BUDGETS.mainKB} kB, lazy ≤ ${BUDGETS.lazyKB} kB, ` +
      `data ≤ ${BUDGETS.dataKB} kB gzip; Leaflet excluded) — and Leaflet confined to its lazy vendor chunk`,
  )
}

// Run only when invoked directly (not when imported by the test). realpath both
// sides so a symlinked invocation path doesn't make the guard silently false.
function isDirectRun(): boolean {
  try {
    return realpathSync(process.argv[1]!) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}
if (isDirectRun()) main()
