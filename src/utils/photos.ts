import type { Activity } from '../types/activity.ts'

/**
 * Themed photo keywords used to feed LoremFlickr. Each pool is biased to
 * "paradise beach" because the user wants a cohesive sun-soaked vibe across
 * the deck, but we tag a few extras based on the activity's category /
 * keywords so a randonnée doesn't look exactly like a snorkel trip.
 */
const HERO_KEYWORDS_FALLBACK = ['tropical', 'beach', 'palm']

const DETAIL_KEYWORD_POOL: string[][] = [
  ['palm', 'beach'],
  ['lagoon', 'turquoise'],
  ['tropical', 'sand'],
  ['paradise', 'palm'],
  ['island', 'tropical'],
  ['beach', 'sunset'],
  ['blue', 'lagoon'],
  ['palm', 'sea'],
  ['tropical', 'view'],
  ['sand', 'palm'],
  ['beach', 'clear'],
  ['island', 'palm'],
]

interface CategoryKeyword {
  match: RegExp
  hero: string[]
  // Optional override for detail photos for thematically specific activities.
  detail?: string[][]
}

const CATEGORY_KEYWORDS: CategoryKeyword[] = [
  {
    match: /Randonnée|Montagne|sommet/i,
    hero: ['mountain', 'tropical', 'jungle'],
  },
  {
    match: /Gastronomie|Spiritueux/i,
    hero: ['food', 'cuisine', 'restaurant'],
  },
  {
    match: /Marché|Artisanat|Shopping/i,
    hero: ['market', 'tropical', 'street'],
  },
  {
    match: /Culture|Histoire/i,
    hero: ['heritage', 'colonial', 'building'],
  },
  {
    match: /Faune|Animale/i,
    hero: ['tropical', 'wildlife', 'lagoon'],
  },
  {
    match: /Bien-être|Détente/i,
    hero: ['spa', 'beach', 'sunset'],
  },
  {
    match: /Air|aérien|hélico/i,
    hero: ['aerial', 'beach', 'tropical'],
  },
]

function categoryFor(activity: Activity): CategoryKeyword | undefined {
  return CATEGORY_KEYWORDS.find((c) => c.match.test(activity.category))
}

function keywordPath(words: string[]): string {
  return words.map((w) => encodeURIComponent(w)).join(',')
}

/**
 * Hero photo URL — used in the card and the detail modal as the first carousel
 * photo.
 */
export function heroPhotoUrl(activity: Activity): string {
  const cat = categoryFor(activity)
  const kws = cat?.hero ?? HERO_KEYWORDS_FALLBACK
  return `https://loremflickr.com/900/1100/${keywordPath(kws)}?lock=${encodeURIComponent(activity.id)}-hero`
}

/**
 * Returns 12 detail photo URLs (the first is the hero, then 11 themed
 * variants). Indices 1..11 use the shared paradise-beach pool so we never
 * fetch generic / off-theme pictures.
 */
export function detailPhotos(activity: Activity): string[] {
  const list: string[] = [heroPhotoUrl(activity)]
  const pool = categoryFor(activity)?.detail ?? DETAIL_KEYWORD_POOL
  for (let i = 1; i < 12; i++) {
    const kws = pool[i % pool.length]!
    list.push(
      `https://loremflickr.com/900/900/${keywordPath(kws)}?lock=${encodeURIComponent(activity.id)}-${i}`,
    )
  }
  return list
}
