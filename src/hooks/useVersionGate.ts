import { useEffect } from 'react'
import {
  subscribeAppVersion,
  publishAppVersion,
} from '../services/firebase/api.ts'
import { APP_VERSION } from '../constants/version.ts'
import { compareVersions } from '../utils/version.ts'

/** sessionStorage key: the version we already reloaded for (loop guard). */
const RELOADED_KEY = 'yallah.reloadedFor.v1'

/**
 * Force-reload stale tabs when a newer build is published.
 *
 * When `enabled` (signed in via Google), subscribe in real time to the global
 * published version (`config/app.version`):
 * - DB version **newer** than this build → this tab is stale → `reload()` (once
 *   per target version, guarded via sessionStorage so an out-of-sync value
 *   can't cause a reload loop);
 * - this build **newer** than the DB (or DB empty) → publish our version, so
 *   other open tabs on the old build reload.
 *
 * Real-time (`onSnapshot`) means any open tab reacts the moment a newer build
 * is seen — no dependency on navigating between pages. No-op when Firebase
 * isn't configured (the subscription never fires).
 */
export function useVersionGate(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    return subscribeAppVersion((remote) => {
      // No published version yet, or ours is newer → we become the publisher.
      if (!remote || compareVersions(remote, APP_VERSION) < 0) {
        void publishAppVersion(APP_VERSION)
        return
      }
      // Published version is newer → this tab is stale → reload (once).
      if (compareVersions(remote, APP_VERSION) > 0) {
        let already: string | null = null
        try {
          already = sessionStorage.getItem(RELOADED_KEY)
        } catch {
          already = null
        }
        if (already === remote) return
        try {
          sessionStorage.setItem(RELOADED_KEY, remote)
        } catch {
          /* private mode — proceed without the guard */
        }
        window.location.reload()
      }
    })
  }, [enabled])
}
