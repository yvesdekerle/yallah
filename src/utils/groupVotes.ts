import type { Verdict } from '../types/verdict.ts'

const VERDICT_WEIGHTS: { v: Verdict; w: number }[] = [
  { v: 'oui', w: 35 },
  { v: 'top', w: 15 },
  { v: 'whynot', w: 25 },
  { v: 'non', w: 15 },
]
const TOTAL_WEIGHT = VERDICT_WEIGHTS.reduce((sum, w) => sum + w.w, 0)

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Stable fake verdict for a (participant, activity) pair. Same inputs
 * always produce the same verdict so the Le-groupe panel doesn't shuffle
 * between renders. Used as a placeholder until we have a backend.
 */
export function fakeVote(participantId: string, activityId: string): Verdict {
  const seed = hashString(`${participantId}::${activityId}`)
  let n = seed % TOTAL_WEIGHT
  for (const { v, w } of VERDICT_WEIGHTS) {
    if (n < w) return v
    n -= w
  }
  return 'oui'
}
