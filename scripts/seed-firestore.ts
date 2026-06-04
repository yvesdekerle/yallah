/**
 * Seed the curated activities (full detail) into Firestore so the database is
 * the source of truth for "all activities" — matching the app's hybrid read
 * model (the app reads curated activities from the bundled JSON for speed, but
 * the DB mirror powers shared editing + the "créé par" attribution).
 *
 * Run once, after creating the Firebase project:
 *
 *   1. Firebase console → Project settings → Service accounts → Generate new
 *      private key. Save the JSON somewhere outside the repo (or as
 *      ./serviceAccount.json — it's gitignored).
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *      export VITE_FIREBASE_PROJECT_ID=your-project   # or FIREBASE_PROJECT_ID
 *   3. npm run seed:firestore
 *
 * Idempotent: re-running merges the curated docs (overwrites curated fields,
 * leaves user-added activities + everyone's votes untouched). Uses the Admin
 * SDK, which bypasses the Firestore security rules.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ROOT = resolve(import.meta.dirname, '..')

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf-8')) as T
}

function readJsonOptional<T>(rel: string, fallback: T): T {
  try {
    return readJson<T>(rel)
  } catch {
    return fallback
  }
}

interface RawActivity {
  id: string
  [key: string]: unknown
}
type Coords = { lat: number; lng: number }

function main(): void {
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      '✗ Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.\n' +
        '  See scripts/seed-firestore.ts header for the full steps.',
    )
    process.exit(1)
  }

  const activities = readJson<RawActivity[]>('src/data/activities.json')
  const coords = readJsonOptional<Record<string, Coords | { source?: string } | null>>(
    'src/data/coords.json',
    {},
  )
  const overrides = readJsonOptional<Record<string, Coords>>(
    'src/data/coords-overrides.json',
    {},
  )
  const photos = readJsonOptional<Record<string, string[]>>(
    'src/data/photos.json',
    {},
  )

  initializeApp({ credential: applicationDefault(), projectId })
  const db = getFirestore()
  // Curated activities have optional fields (duration, difficulty, …); let the
  // SDK drop the absent ones rather than rejecting `undefined`.
  db.settings({ ignoreUndefinedProperties: true })

  const coordsFor = (id: string): Coords | null => {
    if (overrides[id]) return overrides[id]
    const c = coords[id]
    if (c && typeof (c as Coords).lat === 'number') {
      const { lat, lng } = c as Coords
      return { lat, lng }
    }
    return null
  }

  let written = 0
  const CHUNK = 400 // under Firestore's 500-op batch limit
  ;(async () => {
    for (let i = 0; i < activities.length; i += CHUNK) {
      const batch = db.batch()
      for (const a of activities.slice(i, i + CHUNK)) {
        const c = coordsFor(a.id)
        batch.set(
          db.collection('activities').doc(a.id),
          {
            ...a,
            ...(c ? { coords: c } : {}),
            ...(photos[a.id]?.length ? { photoUrls: photos[a.id] } : {}),
            // No `createdBy` ⇒ curated house pick (read-only to clients).
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        written++
      }
      await batch.commit()
      console.log(`  …${written}/${activities.length}`)
    }
    console.log(`✓ seeded ${written} curated activities into Firestore`)
    process.exit(0)
  })().catch((err: unknown) => {
    console.error('✗ seed failed:', err)
    process.exit(1)
  })
}

main()
