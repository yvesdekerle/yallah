import { useCallback, useEffect, useState } from 'react'

/**
 * Toggle the browser into / out of fullscreen via the standard Fullscreen
 * API. Returns the current state plus a `toggle` callback.
 *
 * iOS Safari on iPhone does not implement the API at all — `supported` is
 * false there, and callers should hide their trigger UI. iPad and most
 * desktop browsers do support it.
 */
export function useFullscreen() {
  const supported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function'

  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )

  useEffect(() => {
    if (!supported) return
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [supported])

  const toggle = useCallback(() => {
    if (!supported) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }, [supported])

  return { supported, isFullscreen, toggle }
}
