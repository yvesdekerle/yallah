import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useModalA11y } from '../hooks/useModalA11y.ts'
import { YB } from '../utils/theme.ts'

interface ModalShellProps {
  /** Accessible name for the dialog. */
  ariaLabel: string
  /**
   * Dismiss handler. When omitted the modal is blocking: backdrop taps and
   * Escape do nothing (focus stays trapped) — used for onboarding.
   */
  onClose?: (() => void) | undefined
  /** `center` = centred dialog box, `end` = bottom sheet. */
  align?: 'center' | 'end'
  /** Backdrop darkness. */
  tone?: 'light' | 'heavy'
  /** Tailwind z-layer for the backdrop. */
  zClassName?: string
  /** Classes/styles for the inner (click-swallowing) panel. */
  panelClassName?: string
  panelStyle?: CSSProperties
  /** Pass-through test id on the backdrop. */
  testId?: string
  children: ReactNode
}

const TONE_BG = {
  light: YB.backdrop.light,
  heavy: YB.backdrop.heavy,
} as const

/**
 * Shared modal scaffolding: a labelled `role="dialog"` backdrop, an inner panel
 * that swallows clicks (so taps inside don't dismiss), plus Escape-to-close, a
 * focus trap and focus restoration via {@link useModalA11y}.
 *
 * Centred dialogs (ConfirmModal) use `align="center"`; bottom sheets
 * (IdentityPicker, TagFilterSheet) use `align="end"`. Each consumer styles its
 * own panel via `panelStyle`/`panelClassName` and renders its own close button
 * (wired to the same `onClose`). Rendered at App level so its
 * `position: absolute; inset: 0` anchors to the Phone frame.
 */
export function ModalShell({
  ariaLabel,
  onClose,
  align = 'center',
  tone = 'light',
  zClassName = 'z-overlay',
  panelClassName = '',
  panelStyle,
  testId,
  children,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useModalA11y(panelRef, { onClose })

  const alignClass = align === 'end' ? 'items-end' : 'items-center px-6'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClose}
      className={`absolute inset-0 ${zClassName} flex ${alignClass} justify-center font-sans`}
      style={{ background: TONE_BG[tone] }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`outline-none ${panelClassName}`}
        style={panelStyle}
      >
        {children}
      </div>
    </div>
  )
}
