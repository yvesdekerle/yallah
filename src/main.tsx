import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Splash } from './components/Splash.tsx'
import { loadActivities } from './data/activities.ts'
import { STORAGE_KEYS } from './constants/swipe.ts'
import {
  applyCatalog,
  catalogSignature,
  loadCachedCatalog,
  migrateVoteEntries,
  parseCatalog,
  saveCachedCatalog,
  type PublishedCatalog,
} from './utils/catalog.ts'
import { getPublishedCatalog } from './services/firebase/api.ts'
import type { VoteEntry } from './types/verdict.ts'

const root = createRoot(document.getElementById('root')!)

// The published catalog (outcome of the activity triage, /admin/goprod) is
// applied from its localStorage cache BEFORE the app renders, so the deck
// boots straight on the effective list. The persisted vote history follows the
// same remap (merged activity → its representative, écartée → dropped) so
// retired activities never resurface in the deck or the results.
const catalog = loadCachedCatalog()

function migrateStoredHistory(cat: PublishedCatalog | null): void {
  if (!cat) return
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history)
    if (!raw) return
    const entries = JSON.parse(raw) as unknown
    if (!Array.isArray(entries)) return
    const next = migrateVoteEntries(entries as VoteEntry[], cat)
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next))
  } catch {
    // Unreadable history — leave it to the in-app migration/filtering.
  }
}
migrateStoredHistory(catalog)

// Background refresh: fetch the live publication and, when it differs from
// the copy we booted with, store it and reload so the new list takes over
// (same pattern as the deployed-version poll). Reload only on a successful
// save — a failed write would otherwise loop.
function refreshCatalog(bootSignature: string): void {
  getPublishedCatalog()
    .then((raw) => {
      const fetched = parseCatalog(raw)
      if (catalogSignature(fetched) === bootSignature) return
      if (saveCachedCatalog(fetched)) window.location.reload()
    })
    .catch(() => {
      // Offline / rules hiccup — keep the cached catalog for this session.
    })
}

// Paint the branded splash immediately, then swap in the app once the
// code-split activities chunk resolves — no white flash, no layout jump.
//
// Auth is Firebase Auth (Google provider) — it needs no React provider; the SDK
// is lazy-loaded on first use via `services/firebase/api.ts`, so it stays out of
// the eager entry chunk.
function start() {
  root.render(
    <StrictMode>
      <Splash />
    </StrictMode>,
  )
  loadActivities()
    .then((activities) => {
      root.render(
        <StrictMode>
          <App activities={applyCatalog(activities, catalog)} />
        </StrictMode>,
      )
      refreshCatalog(catalogSignature(catalog))
    })
    .catch(() => {
      // Same-origin static chunk, so this is rare (offline / cache miss). Offer
      // a retry rather than leaving the splash spinning forever.
      root.render(
        <StrictMode>
          <Splash error onRetry={start} />
        </StrictMode>,
      )
    })
}

start()
