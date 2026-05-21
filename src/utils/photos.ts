import type { Activity } from '../types/activity.ts'

/**
 * Bundled hero photo — a vibrant coral-reef shot served from `/public`. We
 * use it for ALL cards in v1 because:
 *   - LoremFlickr was returning broken placeholders on edge keywords
 *   - We only have one curated photo in the design bundle right now
 *   - It's already optimised (~212 KB, 900x1349, JPEG)
 *
 * Future enhancement: add per-category overrides by dropping additional
 * photos into `public/photos/` and wiring a lookup table here.
 */
const HERO_PATH = '/photos/hero.jpg'

/**
 * Hero photo URL — used in the card and as the first carousel photo in the
 * detail modal. Constant for now; the `activity` argument is kept so we can
 * vary by category later without changing call sites.
 */
export function heroPhotoUrl(_activity: Activity): string {
  return HERO_PATH
}

/**
 * Returns 12 detail photo URLs. All point to the same bundled hero for now,
 * keeping the carousel reliable. The carousel UI still works (snap, lightbox,
 * pagination) — visual variety can be added later by bundling more photos
 * under `/public/photos/` and rotating them here.
 */
export function detailPhotos(_activity: Activity): string[] {
  return Array.from({ length: 12 }, () => HERO_PATH)
}
