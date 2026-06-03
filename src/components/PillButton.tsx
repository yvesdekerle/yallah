import { type CSSProperties, type ReactNode } from 'react'
import { YB } from '../utils/theme.ts'

interface PillButtonProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
  /** Variant-specific style (padding, fontSize, gap, minHeight…). */
  style?: CSSProperties
  className?: string
}

/**
 * Shared ink-selected pill: rounded, `aria-pressed`, dark when selected and
 * white-with-border otherwise. The base for the add-activity form's Chip and
 * Toggle; callers layer their own padding/size via `style`.
 *
 * (The coral tag chips in TagFilterSheet / TagPickerPanel deliberately keep
 * their own distinct style and don't use this.)
 */
export function PillButton({
  selected,
  onClick,
  children,
  style,
  className = '',
}: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center font-sans cursor-pointer ${className}`.trimEnd()}
      style={{
        borderRadius: 99,
        background: selected ? YB.ink : '#fff',
        color: selected ? '#fff' : YB.ink,
        border: selected ? '1px solid transparent' : `1px solid ${YB.bgSoft}`,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
