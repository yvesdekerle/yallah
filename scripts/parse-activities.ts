/**
 * Parse `activites-maurice.md` and emit `src/data/activities.json`.
 *
 * The source markdown is curated by hand and follows a regular format:
 *
 *   ### 🌊 Mer & Sports nautiques        <- category heading
 *
 *   #### n°1 [💎] — Title [*(ancien n°X)*]
 *
 *   **Tags** : 🌊 🐅
 *   **Lieu** : Blue Bay (sud-est)
 *   **Trajet depuis Tamarin** : ~1h–1h15
 *   **Description** : ...
 *   **Durée** : ~3–4h            (optional)
 *   **Difficulté** : 🟢 Facile   (optional)
 *   **Prix** : ...
 *   **Note** : ⭐⭐⭐⭐⭐ 5/5
 *   **Insolite** : ...            (optional)
 *
 * Run with: `npm run parse:activities`.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Activity, Difficulty } from '../src/types/activity.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SOURCE_PATH = resolve(ROOT, 'activites-maurice.md')
const OUTPUT_PATH = resolve(ROOT, 'src/data/activities.json')

const DIFFICULTY_MAP: Record<string, { dot: string; label: string }> = {
  '🟢': { dot: '#22C268', label: 'Facile' },
  '🟡': { dot: '#FFB627', label: 'Modérée' },
  '🟠': { dot: '#FF8A00', label: 'Difficile' },
  '🔴': { dot: '#FF4757', label: 'Très difficile' },
}

// Strip the markdown hard-break trailing whitespace (two spaces + \n) and CR.
function normalize(line: string): string {
  return line.replace(/\s+$/, '').replace(/\r$/, '')
}

// Remove markdown bold/italic markers (`**foo**`, `*foo*`) from free-form
// text fields. The app renders descriptions as plain text, so raw markers
// leaked into the JSON appear as literal `**` in the UI. Collapses any
// resulting double spaces too.
function stripMarkdownMarkers(value: string): string {
  return value.replace(/\*+/g, '').replace(/  +/g, ' ').trim()
}

// Split a tags line into a list of emoji-or-symbol tokens. We do NOT try to be
// strict on what's a "tag" — anything non-whitespace token is a tag.
function parseTags(value: string): string[] {
  return value
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function parseRating(value: string): number {
  const m = value.match(/(\d)\s*\/\s*5/)
  if (!m) return 0
  return Number.parseInt(m[1]!, 10)
}

function parseDifficulty(value: string): Difficulty | undefined {
  for (const [emoji, info] of Object.entries(DIFFICULTY_MAP)) {
    if (value.startsWith(emoji)) {
      const rest = value.slice(emoji.length).trim()
      // rest example: "Facile (savoir nager)"
      const detailMatch = rest.match(/^([^()]+?)(?:\s*\(([^)]+)\))?$/)
      const label = (detailMatch?.[1] ?? info.label).trim()
      const detail = detailMatch?.[2]?.trim()
      return detail
        ? { dot: info.dot, label, detail }
        : { dot: info.dot, label }
    }
  }
  return undefined
}

// Parse the activity heading line, e.g.
//   "#### n°6 💎 — Plongée à l'Île Ronde / Île aux Serpents (requins) *(ancien n°48)*"
// We pull out the number and a clean title. Any symbols (💎, 🗝️, …) between
// the number and the em-dash are dropped — the pépite/secret flags come from
// the **Tags** line below.
function parseHeading(line: string): { number: number; title: string } | null {
  // The em-dash separator may be "—" (U+2014) or "–" (U+2013) defensively.
  const m = line.match(/^####\s+n°\s*(\d+)\s*[^—–]*[—–]\s*(.+?)\s*$/)
  if (!m) return null
  const number = Number.parseInt(m[1]!, 10)
  let title = m[2]!
  // Strip the trailing "*(ancien n°X)*"
  title = title.replace(/\s*\*\(ancien n°\d+\)\*\s*$/u, '').trim()
  return { number, title }
}

interface Field {
  key: string
  value: string
}

// Parse a line like `**Lieu** : Blue Bay (sud-est)`.
function parseField(line: string): Field | null {
  const m = line.match(/^\*\*([^*]+)\*\*\s*:\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim(), value: m[2]!.trim() }
}

function parseActivities(src: string): Activity[] {
  const lines = src.split('\n').map(normalize)

  // Only consider lines after the "## Activités par catégorie" marker and
  // before the closing "---" / "## Récap" section.
  const startIdx = lines.findIndex((l) => l.startsWith('## Activités par catégorie'))
  const endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.startsWith('## Récap'),
  )

  if (startIdx < 0 || endIdx < 0) {
    throw new Error('Could not locate the activities section in the markdown.')
  }

  const activities: Activity[] = []
  let currentCategory = ''
  let block: { headingLine: string; fields: string[] } | null = null

  const finalize = () => {
    if (!block) return
    const heading = parseHeading(block.headingLine)
    if (!heading) {
      block = null
      return
    }
    const fieldsRaw = block.fields.map(parseField).filter((f): f is Field => f !== null)
    const get = (key: string) => fieldsRaw.find((f) => f.key === key)?.value

    const tagsRaw = get('Tags') ?? ''
    const tags = parseTags(tagsRaw)
    const pepite = tags.includes('💎')
    const secret = tags.includes('🗝️')
    const sunTagged = tags.includes('☀️') || tags.includes('☀')

    const headingHadDiamond = /💎/.test(block.headingLine)
    const finalPepite = pepite || headingHadDiamond

    const difficulty = get('Difficulté') ? parseDifficulty(get('Difficulté')!) : undefined
    const rating = parseRating(get('Note') ?? '')
    const duration = get('Durée')
    const journee = sunTagged || /journée complète/i.test(duration ?? '')

    const insoliteRaw = get('Insolite')
    activities.push({
      id: `a${heading.number.toString().padStart(3, '0')}`,
      number: heading.number,
      title: heading.title,
      tags,
      category: currentCategory,
      location: get('Lieu') ?? '',
      transit: get('Trajet depuis Tamarin') ?? '',
      description: stripMarkdownMarkers(get('Description') ?? ''),
      duration,
      difficulty,
      price: get('Prix') ?? '',
      rating,
      pepite: finalPepite,
      secret,
      journee,
      insolite: insoliteRaw ? stripMarkdownMarkers(insoliteRaw) : undefined,
    })
    block = null
  }

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i]!
    if (line.startsWith('### ')) {
      // New category; close any open activity block first.
      finalize()
      // Strip leading "### " — keep the emoji + name as-is.
      currentCategory = line.replace(/^###\s+/, '').trim()
      continue
    }
    if (line.startsWith('#### n°')) {
      finalize()
      block = { headingLine: line, fields: [] }
      continue
    }
    if (block && line.startsWith('**')) {
      block.fields.push(line)
    }
  }
  finalize()

  activities.sort((a, b) => a.number - b.number)
  return activities
}

function main(): void {
  const src = readFileSync(SOURCE_PATH, 'utf8')
  const activities = parseActivities(src)
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(activities, null, 2) + '\n', 'utf8')
  console.log(`Parsed ${activities.length} activities → ${OUTPUT_PATH}`)
}

// Run when invoked as a script. When imported (e.g. from tests) the function
// must remain idle.
const invokedDirectly = process.argv[1]
  ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
  : false
if (invokedDirectly) {
  main()
}

export {
  parseActivities,
  parseHeading,
  parseDifficulty,
  parseRating,
  parseTags,
  stripMarkdownMarkers,
}
