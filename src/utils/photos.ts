import type { Activity } from '../types/activity.ts'
import photosData from '../data/photos.json'

/**
 * Map of activity id → array of photo URLs, populated by
 * `npm run fetch:photos` (which queries the Pexels API). Empty by default;
 * the bundled placeholder kicks in for any activity without entries.
 */
const PHOTOS = photosData as Record<string, string[]>

/** Local fallback when an activity has no Pexels photos yet. */
const PLACEHOLDER = '/photos/hero.jpg'

/**
 * Add / override Pexels CDN crop & compression params so we can request the
 * exact size we need for each surface. Pexels images go through their image
 * proxy — adding query params on the file URL is supported.
 *
 * No-op on non-Pexels URLs so manual overrides (local paths, custom CDNs)
 * pass through untouched.
 */
function withSize(url: string, w: number, h: number): string {
  if (!url.includes('images.pexels.com')) return url
  try {
    const u = new URL(url)
    u.searchParams.set('auto', 'compress')
    u.searchParams.set('cs', 'tinysrgb')
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('w', String(w))
    u.searchParams.set('h', String(h))
    return u.toString()
  } catch {
    return url
  }
}

/** Hero photo URL — used in the card and as the first detail-modal photo. */
export function heroPhotoUrl(activity: Activity): string {
  const urls = PHOTOS[activity.id]
  if (!urls || urls.length === 0) return PLACEHOLDER
  return withSize(urls[0]!, 900, 1100)
}

/**
 * Returns up to 12 photo URLs for the detail carousel — fewer is fine, the
 * UI shrinks accordingly. Activities without any Pexels entries fall back
 * to the single bundled placeholder.
 */
export function detailPhotos(activity: Activity): string[] {
  const urls = PHOTOS[activity.id]
  if (!urls || urls.length === 0) return [PLACEHOLDER]
  return urls.slice(0, 12).map((u) => withSize(u, 900, 900))
}
