/**
 * Mapping of the emoji tags used in `activites-maurice.md` to a short
 * human label. Used by the DetailModal to surface a "Légende" panel when
 * the user taps a tag chip.
 *
 * Tags that act as flags (💎 pépite, 🗝️ secret, ☀️ journée) are
 * intentionally listed too — they show up alongside the others in the
 * **Tags** line and benefit from a label when surfaced.
 */
export const TAG_LABELS: Record<string, string> = {
  '🌊': 'Mer & sports nautiques',
  '🍽️': 'Gastronomie & spiritueux',
  '🏛️': 'Patrimoine & culture',
  '🌳': 'Nature & extérieur',
  '🎢': 'Aventure & sensations',
  '🏔️': 'Montagne & randonnée',
  '🐅': 'Faune sauvage',
  '🏝️': 'Île',
  '🧘': 'Bien-être',
  '🛍️': 'Shopping & marchés',
  '✈️': 'Transport / aérien',
  '💎': 'Pépite — coup de cœur',
  '🗝️': 'Insolite / secret',
  '☀️': 'À faire sur une journée',
}

/** Returns the human label for an emoji tag, or the tag itself if unknown. */
export function labelForTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag
}
