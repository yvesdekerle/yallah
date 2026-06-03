import { useEffect, useRef, type RefObject } from 'react'

// Tab-reachable elements inside a modal panel.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface UseModalA11yOptions {
  /**
   * Dismiss handler invoked on Escape. When omitted the modal is *blocking*
   * (e.g. the onboarding identity picker): Escape does nothing, but focus is
   * still trapped inside the panel.
   */
  onClose?: (() => void) | undefined
  /** Move focus into the panel on mount. Defaults to true. */
  autoFocus?: boolean
}

/**
 * Accessibility plumbing shared by every modal/overlay:
 *
 * - **Escape to close** (when `onClose` is provided),
 * - a **focus trap** that keeps Tab / Shift+Tab cycling inside `panelRef`,
 * - **focus restoration** to the previously-focused element on unmount.
 *
 * The keydown handler only acts while focus is inside this panel, so stacked
 * overlays (the fullscreen map over the detail sheet, the photo lightbox over
 * the detail sheet) sequence correctly: one Escape dismisses only the topmost
 * (focused) one. Give the panel element `tabIndex={-1}` so it can receive focus.
 */
export function useModalA11y(
  panelRef: RefObject<HTMLElement | null>,
  { onClose, autoFocus = true }: UseModalA11yOptions = {},
) {
  // Latest onClose held in a ref so the effect can mount once (callers often
  // pass a fresh arrow each render — depending on it would re-autofocus the
  // panel on every parent re-render).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    const restoreTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    if (autoFocus) panel?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      const root = panelRef.current
      // Only the overlay that currently holds focus reacts — this is what makes
      // stacked overlays dismiss one layer at a time.
      if (!root || !root.contains(document.activeElement)) return

      if (e.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return

      const items = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (items.length === 0) {
        e.preventDefault()
        root.focus()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      restoreTo?.focus()
    }
  }, [panelRef, autoFocus])
}
