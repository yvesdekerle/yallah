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
}
export interface Violation extends Chunk {
  budgetKB: number
  kind: 'main' | 'lazy'
}

// Classify chunks by Vite's DEFAULT naming (vite.config.ts sets no
// `manualChunks`/`chunkFileNames`): the entry is `index-[hash].js`;
// `TileLayer-[hash].js` is the Leaflet vendor chunk — a fixed third-party cost
// that's lazy-loaded, so it's EXCLUDED from the budget; everything else is a
// lazy route/feature chunk.
export function evaluateBundle(chunks: Chunk[], budgets: Budgets): Violation[] {
  const violations: Violation[] = []
  for (const c of chunks) {
    if (c.name.startsWith('TileLayer-')) continue // Leaflet vendor — excluded
    if (c.name.startsWith('index-')) {
      if (c.gzipKB > budgets.mainKB) {
        violations.push({ ...c, budgetKB: budgets.mainKB, kind: 'main' })
      }
    } else if (c.gzipKB > budgets.lazyKB) {
      violations.push({ ...c, budgetKB: budgets.lazyKB, kind: 'lazy' })
    }
  }
  return violations
}

// Budgets are measured against this script's `gzipSync(level 9)` output, which
// runs ~4 kB below Vite's build-log gzip number (different compressor effort).
// THIS number is the source of truth — ignore the Vite log for the budget.
const BUDGETS: Budgets = { mainKB: 135, lazyKB: 15 }
const ASSETS_DIR = 'dist/assets'

function kindOf(name: string): string {
  if (name.startsWith('TileLayer-')) return 'leaflet(skip)'
  if (name.startsWith('index-')) return 'main'
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
  const chunks: Chunk[] = files.map((name) => ({
    name,
    gzipKB: gzipSync(readFileSync(join(ASSETS_DIR, name)), { level: 9 }).length / 1024,
  }))

  // Guard against a silent no-op pass: a real build always has an entry chunk.
  if (!chunks.some((c) => c.name.startsWith('index-'))) {
    console.error('✗ no entry chunk (index-*.js) in dist/assets — build output looks wrong.')
    process.exit(1)
  }

  for (const c of [...chunks].sort((a, b) => b.gzipKB - a.gzipKB)) {
    console.log(`  ${c.gzipKB.toFixed(1).padStart(7)} kB  ${kindOf(c.name).padEnd(13)} ${c.name}`)
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
    `\n✓ bundle within budget (main ≤ ${BUDGETS.mainKB} kB, lazy ≤ ${BUDGETS.lazyKB} kB gzip; Leaflet excluded)`,
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
