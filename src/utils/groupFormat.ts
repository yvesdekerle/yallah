import type { Activity, GroupMode } from '../types/activity.ts'

/**
 * Resolve an activity's group format, applying the default: an activity with
 * no explicit `groupMode` is assumed doable `'subgroup'` (the trip can split).
 */
export function groupModeOf(activity: Pick<Activity, 'groupMode'>): GroupMode {
  return activity.groupMode ?? 'subgroup'
}

/**
 * Human label for the group format, shown alongside the other activity meta.
 * `'limited'` reads as a max-participants cap ("Max 6 personnes"); it falls
 * back to a generic label when the size is missing or not a positive integer.
 */
export function groupFormatLabel(
  activity: Pick<Activity, 'groupMode' | 'groupSize'>,
): string {
  const mode = groupModeOf(activity)
  if (mode === 'all') return 'Tous ensemble'
  if (mode === 'limited') {
    const n = activity.groupSize
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
      const rounded = Math.floor(n)
      return `Max ${rounded} personne${rounded > 1 ? 's' : ''}`
    }
    return 'Nombre limité'
  }
  return 'En sous-groupe'
}
