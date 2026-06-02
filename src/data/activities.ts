import type { Activity } from '../types/activity.ts'
import raw from './activities.json'

/**
 * Curated list of activities. The source of truth lives in
 * `activites-maurice.md` at the repo root and is parsed into
 * `activities.json` via `npm run parse:activities`.
 */
// Typed annotation (not `as`) so the build validates the generated JSON
// against the Activity shape instead of blindly trusting it.
export const ACTIVITIES: Activity[] = raw
