import { useMemo, useState } from 'react'
import type { Activity } from '../types/activity.ts'
import { YB } from '../utils/theme.ts'
import { X, Pin } from '../icons/index.tsx'
import { labelForTag } from '../utils/tags.ts'

/**
 * Hero block of the DetailModal: the photo, the close button, the tag chips
 * with their toggleable legend, and the title/location overlay. Owns the
 * `legendOpen` state since it's used nowhere else.
 */
export function DetailHero({
  activity,
  heroPhoto,
  onClose,
}: {
  activity: Activity
  heroPhoto: string
  onClose: () => void
}) {
  const [legendOpen, setLegendOpen] = useState(false)
  // The first 3 tags drive both the chips and the legend list — compute once.
  const topTags = useMemo(() => activity.tags.slice(0, 3), [activity.tags])
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: '4 / 4.1',
        background: `url(${heroPhoto}) center center/cover, ${YB.ink}`,
      }}
    >
      {/* Bottom gradient for title legibility */}
      <div
        className="pointer-events-none absolute left-0 right-0 bottom-0"
        style={{
          height: '55%',
          background:
            'linear-gradient(180deg, rgba(15,18,28,0) 0%, rgba(15,18,28,0.25) 45%, rgba(15,18,28,0.78) 88%, rgba(15,18,28,0.92) 100%)',
        }}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="fermer"
        className="absolute z-[3] flex items-center justify-center border-0 cursor-pointer"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          left: 14,
          width: 38,
          height: 38,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 4px 10px -2px rgba(20,30,50,0.25)',
        }}
      >
        <X color={YB.ink} size={20} />
      </button>

      {/* Tag chips — tap to toggle the legend */}
      <div
        className="absolute z-[3] flex flex-col"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 14,
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        <div className="flex" style={{ gap: 4 }}>
          {topTags.map((tag, i) => (
            <button
              type="button"
              key={`${tag}-${i}`}
              onClick={() => setLegendOpen((v) => !v)}
              aria-label={labelForTag(tag)}
              aria-expanded={legendOpen}
              className="inline-flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: legendOpen ? '#fff' : 'rgba(255,255,255,0.95)',
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
        {legendOpen && (
          <div
            role="dialog"
            aria-label="Légende des tags"
            className="font-sans"
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
              {topTags.map((tag, i) => (
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

      {/* Title block */}
      <div
        className="absolute z-[2] text-white"
        style={{ left: 20, right: 20, bottom: 18 }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10.5,
            letterSpacing: 1.5,
            opacity: 0.78,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          Nº{activity.number.toString().padStart(2, '0')}
        </div>
        <h1
          className="m-0 font-sans"
          style={{
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: -0.6,
            textShadow: '0 2px 12px rgba(0,0,0,0.35)',
          }}
        >
          {activity.title}
        </h1>
        <div
          className="flex items-center"
          style={{
            gap: 8,
            marginTop: 10,
            fontSize: 13,
            fontWeight: 500,
            opacity: 0.95,
          }}
        >
          <Pin color="#fff" size={14} />
          {activity.location}
        </div>
      </div>
    </div>
  )
}
