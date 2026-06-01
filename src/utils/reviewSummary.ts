import summariesData from '../data/reviewSummaries.json'

const summaries = summariesData as Record<string, string | null | undefined>

/**
 * Per-activity review summary aggregated from real visitor feedback
 * (TripAdvisor, GetYourGuide, Google Maps, blog posts, etc.). Hand-edited
 * in `src/data/reviewSummaries.json`. Returns `null` when an activity
 * has no curated summary yet — caller falls back to the generic
 * rating-based phrase from [[rating]].
 */
export function getReviewSummary(activityId: string): string | null {
  const value = summaries[activityId]
  return value && value.length > 0 ? value : null
}
