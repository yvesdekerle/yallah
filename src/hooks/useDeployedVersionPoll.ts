import { useEffect } from 'react'
import { APP_VERSION } from '../constants/version.ts'
import { reloadIfOutdated } from '../utils/version.ts'

/** How often to re-check the deployed version while the tab is foregrounded. */
const POLL_MS = 60_000

/**
 * Read the version the CDN is currently serving from the static `version.json`
 * emitted at build time. `cache: 'no-store'` + a cache-busting query defeat any
 * edge/browser caching so we always see the freshly deployed value. Any
 * failure (offline, 404 in `dev`, malformed body) resolves to `null` ⇒ no-op.
 */
async function fetchDeployedVersion(
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      signal,
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (
      data !== null &&
      typeof data === 'object' &&
      'version' in data &&
      typeof (data as { version: unknown }).version === 'string'
    ) {
      return (data as { version: string }).version
    }
    return null
  } catch {
    return null
  }
}

/**
 * Deploy-driven update detection — works in EVERY mode (demo or Google),
 * independent of Firebase.
 *
 * Polls the static `/version.json` that Vite emits at build time (served fresh
 * by the CDN the moment a new build deploys). When the deployed version is
 * newer than this running build, reloads the tab once (guarded via
 * {@link reloadIfOutdated}). Checks on mount, every {@link POLL_MS} while the
 * tab is visible, and whenever it regains focus/visibility — so a backgrounded
 * PWA picks up the update the moment the user returns to it.
 */
export function useDeployedVersionPoll(): void {
  useEffect(() => {
    const controller = new AbortController()

    const check = async () => {
      const remote = await fetchDeployedVersion(controller.signal)
      if (remote) reloadIfOutdated(remote, APP_VERSION)
    }

    const onForeground = () => {
      if (document.visibilityState === 'visible') void check()
    }

    void check()
    const timer = setInterval(() => void check(), POLL_MS)
    document.addEventListener('visibilitychange', onForeground)
    window.addEventListener('focus', onForeground)

    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onForeground)
      window.removeEventListener('focus', onForeground)
    }
  }, [])
}
