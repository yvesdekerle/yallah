import linksData from '../data/links.json'
import type { Coords } from './coords.ts'

export interface ActivityLink {
  url: string
  /** Short human label — operator name, "Réservation", "Site officiel", etc. */
  label?: string
  /** Optional coords for multi-location activities (e.g. several kayak
      rental shops) — reserved for future multi-pin map rendering. */
  coords?: Coords
}

const links = linksData as Record<string, ActivityLink[] | undefined>

/**
 * Curated external links for an activity. Hand-edited in
 * `src/data/links.json` — populate as you discover operator sites,
 * booking pages, or maps. Returns `[]` when the activity has none.
 *
 * The list is also the data source for multi-location activities
 * (one entry per operator/spot — e.g. several kayak rental shops).
 */
export function getLinks(activityId: string): ActivityLink[] {
  return links[activityId] ?? []
}
