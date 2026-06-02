import type { Activity } from '../types/activity.ts'

/**
 * Curated list of activities. The source of truth lives in
 * `activites-maurice.md` at the repo root and is parsed into
 * `activities.json` via `npm run parse:activities`.
 *
 * Loaded via a DYNAMIC `import()` so the ~134 kB JSON (~35 kB gzip) is split
 * into its own chunk and fetched after first paint instead of inflating the
 * main bundle. `main.tsx` awaits this behind a splash before mounting <App>,
 * which then receives the list as a plain prop (and stays synchronous).
 */
export async function loadActivities(): Promise<Activity[]> {
  // Typed annotation (not `as`) so the build validates the generated JSON
  // against the Activity shape instead of blindly trusting it.
  const { default: data }: { default: Activity[] } = await import(
    './activities.json'
  )
  return data
}
