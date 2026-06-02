import { useEffect } from 'react'
import { APP_VERSION, APP_VERSION_KEY } from '../constants/version.ts'

/**
 * On mount, compare the running {@link APP_VERSION} with the last version this
 * device ran (persisted in localStorage):
 *
 * - first-ever run → just record the version (no upgrade signal),
 * - stored version differs → call `onUpgrade(APP_VERSION)` once, then record it,
 * - already up to date → no-op.
 *
 * Persists directly via localStorage (the value isn't reactive — we only need a
 * one-time read/compare/write on load). `onUpgrade` should be stable
 * (useCallback); if it isn't, the recompare is idempotent (the version is
 * already recorded, so it won't fire twice).
 */
export function useAppVersionCheck(onUpgrade: (version: string) => void) {
  useEffect(() => {
    let prev: string | null = null
    try {
      prev = localStorage.getItem(APP_VERSION_KEY)
    } catch {
      prev = null
    }
    if (prev === APP_VERSION) return
    if (prev) onUpgrade(APP_VERSION)
    try {
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION)
    } catch {
      /* private mode / quota exceeded — ignore */
    }
  }, [onUpgrade])
}
