import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { YB } from '../utils/theme.ts'
import { labelForTag } from '../utils/tags.ts'

interface TagLegendProps {
  /** The first (up to 3) tags — the parent slices. */
  tags: string[]
  open: boolean
  onToggle: () => void
  /** On the swipe card, swallow pointer events so toggling can't start a drag. */
  swallowPointerEvents?: boolean
  /** Positioning hooks for the absolute container. */
  className?: string
  style?: CSSProperties
}

const stopPointer = {
  onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
  onPointerMove: (e: ReactPointerEvent) => e.stopPropagation(),
  onPointerUp: (e: ReactPointerEvent) => e.stopPropagation(),
}

/**
 * Tag chips (top-right of a card / detail hero) that toggle a small legend
 * popup mapping each emoji to its French label. Controlled — the parent owns
 * the open state. Shared by Card and DetailHero (IMP-07).
 */
export function TagLegend({
  tags,
  open,
  onToggle,
  swallowPointerEvents = false,
  className = '',
  style,
}: TagLegendProps) {
  const swallow = swallowPointerEvents ? stopPointer : {}
  return (
    <div
      className={`flex flex-col items-end ${className}`.trimEnd()}
      style={{ gap: 6, ...style }}
    >
      <div className="flex" style={{ gap: 4 }}>
        {tags.map((tag, i) => (
          <button
            type="button"
            key={`${tag}-${i}`}
            {...swallow}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            aria-label={labelForTag(tag)}
            aria-expanded={open}
            className="inline-flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              background: open ? '#fff' : 'rgba(255,255,255,0.95)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 16,
              boxShadow:
                tag === '💎'
                  ? `0 0 0 2px ${YB.top}, 0 2px 8px -2px rgba(20,30,50,0.15)`
                  : '0 2px 8px -2px rgba(20,30,50,0.15)',
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Légende des tags"
          className="font-sans"
          {...swallow}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(255,255,255,0.97)',
            color: YB.ink,
            borderRadius: 14,
            padding: '10px 12px',
            boxShadow: '0 6px 20px -6px rgba(20,30,50,0.35)',
            maxWidth: 220,
            fontSize: 12.5,
            lineHeight: 1.35,
          }}
        >
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {tags.map((tag, i) => (
              <li
                key={`legend-${tag}-${i}`}
                className="flex items-center"
                style={{ gap: 8 }}
              >
                <span style={{ fontSize: 15 }} aria-hidden>
                  {tag}
                </span>
                <span>{labelForTag(tag)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
