import { useCallback, useEffect, useState } from 'react'

/**
 * Persist a piece of state in `window.localStorage`, keyed by `key`.
 *
 * - The initial state is loaded from localStorage on mount. If parsing fails
 *   (corrupted JSON, schema change), `defaultValue` is used and the bad entry
 *   is left intact (silent fallback — we don't want to wipe data unilaterally).
 * - Writes are mirrored to localStorage. Failures (quota exceeded, private
 *   mode, etc.) are swallowed — the in-memory state remains the source of truth
 *   for the current session.
 * - Cross-tab sync: listens for `storage` events and reflects changes from
 *   other tabs of the same origin.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  // `defaultValue` is captured at mount time, matching `useState`'s
  // initial-value semantics. Callers should pass a stable value (or a
  // memoized one) if they want the cross-tab "clear" fallback to use a
  // specific shape.
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return defaultValue
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  })

  const setAndStore = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // Storage may be unavailable — keep the in-memory value anyway.
        }
        return resolved
      })
    },
    [key],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      if (e.newValue === null) {
        setValue(defaultValue)
        return
      }
      try {
        setValue(JSON.parse(e.newValue) as T)
      } catch {
        setValue(defaultValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // We deliberately omit `defaultValue` from deps — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [value, setAndStore]
}
