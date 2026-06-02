import { useCallback, useMemo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'
import { coordsFor } from '../utils/coords.ts'
import type { MapPin } from '../components/FullscreenMap.tsx'

/**
 * Derives the FullscreenMap pins from the vote history: the deduped set of
 * LIKE/SUPER-LIKE activities that have coordinates (`likedPins`), and a
 * single-activity pin builder for the DetailModal mini-map (`singleMapPin`).
 */
export function useMapPins(history: VoteEntry[], allActivities: Activity[]) {
  const likedPins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = []
    const seen = new Set<string>()
    for (const h of history) {
      if (h.verdict !== 'oui' && h.verdict !== 'top') continue
      if (seen.has(h.id)) continue
      seen.add(h.id)
      const activity = allActivities.find((a) => a.id === h.id)
      if (!activity) continue
      const coords = coordsFor(activity)
      if (!coords) continue
      out.push({ activity, coords, verdict: h.verdict })
    }
    return out
  }, [history, allActivities])

  const singleMapPin = useCallback(
    (activityId: string): MapPin[] => {
      const activity = allActivities.find((a) => a.id === activityId)
      if (!activity) return []
      const coords = coordsFor(activity)
      if (!coords) return []
      const existing = history.find((h) => h.id === activityId)
      const verdict =
        existing && (existing.verdict === 'oui' || existing.verdict === 'top')
          ? existing.verdict
          : 'oui'
      return [{ activity, coords, verdict }]
    },
    [history, allActivities],
  )

  return { likedPins, singleMapPin }
}
