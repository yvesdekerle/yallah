import type { ReactNode } from 'react'
import { YB } from '../utils/theme.ts'

interface MetaChipProps {
  /** Icon rendered to the left of the value. */
  icon?: ReactNode
  /** Coloured dot rendered before the value (for difficulty). */
  dot?: string
  value: string
}

/** Soft sand-coloured pill used in the detail modal meta-strip. */
export function MetaChip({ icon, dot, value }: MetaChipProps) {
  return (
    <div
      className="inline-flex items-center font-sans"
      style={{
        gap: 6,
        padding: '7px 12px',
        background: YB.bgSoft,
        borderRadius: 99,
        fontWeight: 600,
        fontSize: 13,
        color: YB.ink,
        letterSpacing: -0.1,
      }}
    >
      {dot && (
        <span
          style={{ width: 8, height: 8, borderRadius: 99, background: dot }}
        />
      )}
      {icon}
      <span>{value}</span>
    </div>
  )
}
