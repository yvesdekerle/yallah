/**
 * Seed the shared activity-triage state (the /admin/activities page) into
 * Firestore: `activityTriage/current`. The page itself reads/writes this doc
 * with an optimistic version lock (see firestore.rules) — this script is only
 * for the initial import of a JSON export, or to force-restore a backup.
 *
 *   npm run seed:triage                          # reads workdir/yallah-tri-partage.json
 *   npm run seed:triage -- --file=path.json      # custom file
 *   npm run seed:triage -- --force               # overwrite an existing doc (version + 1)
 *
 * Accepts either the page's share format ({ activites: { state } }) or a raw
 * state object ({ groups: [...] }). Only the state is stored — the page
 * recomputes stats/decisions from it.
 *
 * Credentials: same as seed-firestore.ts (GOOGLE_APPLICATION_CREDENTIALS +
 * VITE_FIREBASE_PROJECT_ID, auto-loaded from .env.local via the npm script).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ROOT = resolve(import.meta.dirname, '..')

interface TriageState {
  groups: unknown[]
  [key: string]: unknown
}

function extractState(raw: unknown): TriageState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  const nested = (obj.activites as Record<string, unknown> | undefined)?.state
  const candidate = nested ?? obj
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    Array.isArray((candidate as Record<string, unknown>).groups)
  ) {
    return candidate as TriageState
  }
  return null
}

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

  const args = process.argv.slice(2)
  const fileArg = args
    .find((a) => a.startsWith('--file='))
    ?.slice('--file='.length)
  const force = args.includes('--force')
  const file = resolve(ROOT, fileArg ?? 'workdir/yallah-tri-partage.json')

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf-8'))
  } catch (err) {
    console.error(`✗ cannot read ${file}:`, err)
    process.exit(1)
  }
  const state = extractState(raw)
  if (!state) {
    console.error(
      `✗ ${file} is not a valid triage export (missing "groups" array, directly or under activites.state).`,
    )
    process.exit(1)
  }

  initializeApp({ credential: applicationDefault(), projectId })
  const db = getFirestore()
  const ref = db.collection('activityTriage').doc('current')

  ;(async () => {
    const snap = await ref.get()
    if (snap.exists && !force) {
      console.error(
        `✗ activityTriage/current already exists (v${String(snap.data()?.version ?? '?')}).\n` +
          '  Re-run with --force to overwrite it (bumps the version so open pages detect the change).',
      )
      process.exit(1)
    }
    const version = snap.exists
      ? (typeof snap.data()?.version === 'number'
          ? (snap.data()?.version as number)
          : 0) + 1
      : 1
    await ref.set({
      version,
      state: JSON.stringify(state),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: { uid: 'seed-script', name: 'Import initial' },
    })
    console.log(
      `✓ seeded activityTriage/current v${version} (${state.groups.length} groupes) from ${file}`,
    )
    process.exit(0)
  })().catch((err: unknown) => {
    console.error('✗ seed failed:', err)
    process.exit(1)
  })
}

main()
