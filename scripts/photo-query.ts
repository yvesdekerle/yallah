/**
 * Build a Pexels search query from a French activity title + category.
 *
 * Strategy:
 *   1. Strip emojis / numbers / parentheses chars (but keep parens content,
 *      since "Plongée (baptême)" contains useful info).
 *   2. Drop Mauritius-specific place names & brand names — Pexels has no
 *      photos of them, and they add noise.
 *   3. Apply multi-word French → English translations (e.g. "plongée
 *      sous-marine" → "scuba diving").
 *   4. Strip accents, lowercase, tokenise.
 *   5. Drop stopwords + length <3 tokens.
 *   6. Apply single-word FR → EN translation.
 *   7. Append a category hint and cap at ~6 tokens — Pexels does best with
 *      tight, focused queries.
 *
 * Exported separately from the runner so the heuristics can be unit-tested.
 */

import type { Activity } from '../src/types/activity.ts'

// Mauritius landmark names we KEEP (they help Pexels find Mauritius photos).
// We only strip private brand names and obscure spots that won't yield any
// matches even with "mauritius" appended.
const PLACE_BRAND_PATTERNS: RegExp[] = [
  // Multi-word brand / experience names — never indexed on Pexels.
  /\bsave the last dodo\b/g,
  /\bblue safari\b/g,
  /\bdodo quest\b/g,
  /\blokal adventures?\b/g,
  /\bsea lovers?\b/g,
  /\bcrown lodge\b/g,
  /\bkite lagoon\b/g,
  /\bone[- ]eye\b/g,
  /\bcristal\s+blue\b/g,

  // Single-word brand / vessel / niche names.
  /\bauthentiseaty\b/g,
  /\bstella maru\b/g,
  /\bdjabeda\b/g,
  /\bstar hope\b/g,
  /\bmaradiva\b/g,
  /\bmanawa\b/g,
  /\bbs\s*\d+/g, // submarine model "BS600" / "BS1100"

  // Obscure islets without dedicated Pexels coverage.
  /\bilot bernaches\b/g,
  /\bilot gabriel\b/g,
  /\bilot mangenie\b/g,
  /\bilot mouchoir rouge\b/g,
  /\bilot sanchot\b/g,
  /\bilot vacoas\b/g,
  /\bile fouquets?\b/g,
  /\bile marianne\b/g,
  /\bile de la passe\b/g,
  /\bile des deux cocos\b/g,
  /\bile aux phares?\b/g,
]

// Multi-word French phrases → English. Applied BEFORE single-word translation.
const PHRASE_TRANSLATIONS: [RegExp, string][] = [
  [/coucher de soleil/g, 'sunset'],
  [/lever de soleil/g, 'sunrise'],
  [/plongee sous[- ]marine/g, 'scuba diving'],
  [/plongee\s+nocturne/g, 'night scuba diving'],
  [/peche au gros/g, 'deep sea fishing'],
  [/peche traditionnelle/g, 'traditional fishing'],
  [/peche au filet/g, 'net fishing'],
  [/peche a la mouche/g, 'fly fishing'],
  [/bateau a fond de verre/g, 'glass bottom boat'],
  [/voile latine/g, 'lateen sail'],
  [/yacht a voile/g, 'sailing yacht'],
  [/a voile/g, 'sailing'],
  [/sous[- ]marin/g, 'submarine'],
  [/sub[- ]scooter/g, 'underwater scooter'],
  [/seabob/g, 'underwater scooter'],
  [/stand[- ]up paddle/g, 'paddleboarding'],
  [/sup\b/g, 'paddleboarding'],
  [/marche aquatique/g, 'sea trek'],
  [/sea trekking?/g, 'sea trek'],
  [/aqua trekking?/g, 'sea trek'],
  [/jet ski/g, 'jetski'],
  [/jet[- ]ski/g, 'jetski'],
  [/parachute ascensionnel/g, 'parasailing'],
  [/montgolfiere/g, 'hot air balloon'],
  [/ulm pendulaire/g, 'ultralight'],
  [/sortie en mer/g, 'boat trip'],
  [/sortie sunset/g, 'sunset boat'],
  [/sortie nocturne/g, 'night out'],
  [/coucher du soleil/g, 'sunset'],
  [/parc national/g, 'national park'],
  [/jardin botanique/g, 'botanical garden'],
  [/parc marin/g, 'marine park'],
  [/parc des couleurs/g, 'colored earth'],
  [/terres des sept couleurs/g, 'colored earth'],
  [/sept couleurs/g, 'colored earth'],
  [/marche de nuit/g, 'night market'],
  [/distillerie de rhum/g, 'rum distillery'],
  [/route du rhum/g, 'rum trail'],
  [/cuisine creole/g, 'creole cuisine'],
  [/dejeuner chez l['\s]habitant/g, 'home cooking'],
  [/table d['\s]hotes?/g, 'home cooking'],
  [/escape game/g, 'escape room'],
  [/quad biking/g, 'quad bike'],
  [/buggy ride/g, 'buggy'],
  [/safari photo/g, 'photo safari'],
  [/observation des? cetaces?/g, 'whale watching'],
  [/observation des? dauphins?/g, 'dolphin watching'],
  [/observation des? baleines?/g, 'whale watching'],
  [/nager avec les dauphins?/g, 'swim with dolphins'],
  [/nager avec les cachalots?/g, 'swim with sperm whale'],
  [/nager avec les baleines?/g, 'swim with whale'],
  [/baleine[s]? a bosse/g, 'humpback whale'],
  [/balade a cheval/g, 'horse riding'],
  [/balade en bateau/g, 'boat ride'],
  [/balade en kayak/g, 'kayak ride'],
  [/balade nature/g, 'nature walk'],
  [/randonnee aquatique/g, 'sea trek'],
  [/film en plein air/g, 'open air cinema'],
  [/cinema en plein air/g, 'open air cinema'],
  [/drive[- ]in/g, 'drive-in cinema'],
  [/spa de luxe/g, 'luxury spa'],
  [/massage ayurvedique/g, 'ayurveda spa'],
  [/cours de yoga/g, 'yoga class'],
  [/initiation au surf/g, 'surfing lesson'],
  [/cours de kite/g, 'kitesurfing'],
  [/cours de cuisine/g, 'cooking class'],
  [/tour de l['\s]ile/g, 'island tour'],
  [/tour en helicoptere/g, 'helicopter tour'],
  [/tour en bateau/g, 'boat tour'],
]

// Single-word French → English (lowercase, no accents).
const WORD_TRANSLATIONS: Record<string, string> = {
  plongee: 'scuba',
  snorkeling: 'snorkeling',
  snorkel: 'snorkeling',
  kayak: 'kayak',
  kayaking: 'kayaking',
  pirogue: 'outrigger canoe',
  canoe: 'canoe',
  canoeing: 'canoeing',
  voile: 'sailing',
  voilier: 'sailboat',
  yacht: 'yacht',
  catamaran: 'catamaran',
  bateau: 'boat',
  bateaux: 'boats',
  speedboat: 'speedboat',
  randonnee: 'hiking',
  randonnees: 'hiking',
  trek: 'trek',
  trekking: 'trekking',
  // "marche" alone could mean "marché" or "marcher" — we map it to the
  // commercial meaning (market) since that's the more common one in the
  // dataset. "marche aquatique" / "randonnée" cover the walking case via
  // phrase patterns.
  balade: 'walk',
  balades: 'walks',
  velo: 'cycling',
  cyclisme: 'cycling',
  course: 'running',
  natation: 'swimming',
  nager: 'swim',
  nage: 'swimming',
  surf: 'surf',
  surfing: 'surfing',
  kitesurf: 'kitesurfing',
  kitesurfing: 'kitesurfing',
  kite: 'kitesurfing',
  windsurf: 'windsurfing',
  windsurfing: 'windsurfing',
  flyboard: 'flyboard',
  paddle: 'paddleboarding',
  paddleboard: 'paddleboarding',
  paddleboarding: 'paddleboarding',
  canyoning: 'canyoning',
  rappel: 'rappelling',
  rappels: 'rappelling',
  escalade: 'climbing',
  via: 'via ferrata',
  ferrata: 'ferrata',
  peche: 'fishing',
  pecheur: 'fisherman',
  pecheurs: 'fishermen',
  filet: 'net fishing',
  marlin: 'marlin',
  thon: 'tuna',
  requin: 'shark',
  requins: 'sharks',
  raies: 'rays',
  raie: 'ray',
  cachalot: 'sperm whale',
  cachalots: 'sperm whales',
  dauphin: 'dolphin',
  dauphins: 'dolphins',
  baleine: 'whale',
  baleines: 'whales',
  tortue: 'sea turtle',
  tortues: 'sea turtles',
  poisson: 'fish',
  poissons: 'fish',
  corail: 'coral',
  coraux: 'coral',
  recif: 'reef',
  recifs: 'reef',
  mangrove: 'mangrove',
  lagon: 'lagoon',
  lagons: 'lagoon',
  mer: 'sea',
  ocean: 'ocean',
  plage: 'beach',
  plages: 'beach',
  sable: 'sand',
  rivage: 'shore',
  ile: 'island',
  iles: 'island',
  ilot: 'islet',
  ilots: 'islet',
  cascade: 'waterfall',
  cascades: 'waterfall',
  chute: 'waterfall',
  chutes: 'waterfall',
  montagne: 'mountain',
  montagnes: 'mountain',
  sommet: 'summit',
  sommets: 'summit',
  falaise: 'cliff',
  falaises: 'cliff',
  grotte: 'cave',
  grottes: 'cave',
  jungle: 'jungle',
  foret: 'forest',
  forets: 'forest',
  parc: 'park',
  jardin: 'garden',
  jardins: 'garden',
  musee: 'museum',
  musees: 'museum',
  marche: 'market',
  marches: 'market',
  temple: 'temple',
  eglise: 'church',
  cathedrale: 'cathedral',
  phare: 'lighthouse',
  fort: 'fort',
  forteresse: 'fortress',
  forteresses: 'fortress',
  epave: 'shipwreck',
  epaves: 'shipwreck',
  rhum: 'rum',
  distillerie: 'rum distillery',
  vin: 'wine',
  cocktail: 'cocktail',
  cocktails: 'cocktails',
  restaurant: 'restaurant',
  resto: 'restaurant',
  brunch: 'brunch',
  gastronomie: 'cuisine',
  cuisine: 'cuisine',
  food: 'food',
  street: 'street food',
  spa: 'spa',
  massage: 'massage',
  yoga: 'yoga',
  meditation: 'meditation',
  helicoptere: 'helicopter',
  helico: 'helicopter',
  parapente: 'paragliding',
  parachutisme: 'skydiving',
  parachute: 'parachute',
  ulm: 'ultralight',
  drone: 'drone',
  quad: 'quad bike',
  buggy: 'buggy',
  tyrolienne: 'zipline',
  saut: 'jump',
  sauts: 'jumps',
  sunset: 'sunset',
  sunrise: 'sunrise',
  nuit: 'night',
  bioluminescence: 'bioluminescence',
  nocturne: 'night',
  matinal: 'morning',
  traditionnelle: 'traditional',
  traditionnel: 'traditional',
  tradition: 'traditional',
  ancien: 'historic',
  ancienne: 'historic',
  histoire: 'history',
  historique: 'historic',
  colonial: 'colonial',
  coloniale: 'colonial',
  visite: 'tour',
  visites: 'tour',
  tour: 'tour',
  excursion: 'tour',
  croisiere: 'cruise',
  expedition: 'expedition',
  observation: 'watching',
  spectateur: 'watching',
  baptme: 'try',
  bapteme: 'beginner',
  raffinerie: 'refinery',
  sucre: 'sugar',
  baie: 'bay',
  drift: 'drift',
  geant: 'giant',
  geante: 'giant',
  gros: 'big',
  // common French connectors / weak words → drop (mapped to '')
}

const STOPWORDS = new Set([
  'a', 'au', 'aux', 'avec', 'dans', 'de', 'des', 'du', 'en', 'et', 'la',
  'le', 'les', 'ou', 'par', 'pour', 'sans', 'sous', 'sur', 'un', 'une',
  'l', 'd', 'chez', 'vers', 'pres', 'apres', 'avant', 'pendant', 'mais', 'donc',
  'qui', 'que', 'quoi', 'quel', 'quels', 'quelle', 'quelles',
  'sortie', 'sorties', 'activite', 'activites', 'experience', 'experiences',
  'option', 'options', 'super', 'top', 'meilleur', 'meilleure',
  'saison', 'soit', 'parfois',
  'this', 'that', 'with', 'and', 'the', 'of', 'in', 'on',
  // Mauritian compass words that don't help on Pexels:
  'nord', 'sud', 'est', 'ouest', 'centre', 'cote',
  // Words that leaked through that aren't useful:
  'courant', 'baptme', 'exploration',
])


export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function autoQuery(activity: Activity): string {
  let s = activity.title.toLowerCase()
  // Remove parens characters (keep the content for context).
  s = s.replace(/[()]/g, ' ')
  // Strip sentinel emojis.
  s = s
    .replace(/\u{1F48E}/gu, ' ') // 💎
    .replace(/\u{1F5DD}/gu, ' ') // 🗝️
    .replace(/\u{FE0F}/gu, ' ') // emoji variation selector
    .replace(/[·"„""'']/g, ' ')
  // Numbers (e.g. "-35 m").
  s = s.replace(/-?\d+\s*m?\b/g, ' ')
  // Normalise accents + collapse whitespace so the place/brand regexes work.
  s = stripAccents(s).replace(/\s+/g, ' ').trim()
  // Drop Mauritius place + brand names.
  for (const re of PLACE_BRAND_PATTERNS) s = s.replace(re, ' ')
  // Multi-word translations.
  for (const [re, en] of PHRASE_TRANSLATIONS) s = s.replace(re, ` ${en} `)

  // Tokenise.
  const words = s
    .split(/[\s,'/.\-:;!?]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => WORD_TRANSLATIONS[w] ?? w)

  // De-duplicate while preserving order; cap at 6 tokens for focus.
  const seen = new Set<string>()
  const focused: string[] = []
  for (const w of words) {
    if (seen.has(w)) continue
    seen.add(w)
    focused.push(w)
    if (focused.length >= 6) break
  }

  // Always anchor the search to Mauritius so Pexels biases toward
  // location-specific photos rather than generic stock tropical shots.
  return `${focused.join(' ')} mauritius`.replace(/\s+/g, ' ').trim()
}
