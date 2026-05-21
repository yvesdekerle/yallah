import type { ReactNode } from 'react'
import { YB } from '../utils/theme.ts'

interface SectionHeadingProps {
  children: ReactNode
  /** Optional count rendered as a faded suffix (e.g. "12"). */
  count?: number
}

export function SectionHeading({ children, count }: SectionHeadingProps) {
  return (
    <div className="flex items-baseline" style={{ gap: 8, marginBottom: 14 }}>
      <h3
        className="m-0 font-sans"
        style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.3,
          color: YB.ink,
        }}
      >
        {children}
      </h3>
      {count != null && (
        <span
          className="font-sans"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#9A93A6',
            letterSpacing: -0.1,
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}
