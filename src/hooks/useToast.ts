import { useCallback, useState } from 'react'

export interface ToastState {
  id: number
  text: string
  emoji?: string | undefined
}

/**
 * Single transient toast. `showToast` mints a fresh `id` on every call so the
 * `<Toast key={toast.id}>` remounts and re-fires its entry animation even when
 * the same message is shown twice in a row.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((text: string, emoji?: string) => {
    setToast({ id: Date.now(), text, emoji })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  return { toast, showToast, dismissToast }
}
