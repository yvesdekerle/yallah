import { useState, type ReactNode } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { heroPhotoUrl } from '../utils/photos.ts'
import { Pin, Clock, StarFilled, Wallet } from '../icons/index.tsx'
import {
  shortPrice,
  shortDuration,
  formatLocation,
  formatRating,
} from '../utils/format.ts'
import { labelForTag } from '../utils/tags.ts'
import { coordsFor } from '../utils/coords.ts'
import { BASE_TAMARIN, estimateDriveTime } from '../utils/distance.ts'

interface CardProps {
  activity: Activity
  /**
   * When set, the corresponding drag stamp is shown on the card. The actual
   * stamp components are rendered separately in the parent so that during an
   * exit they can slide off attached to the card wrapper.
   */
  dragState?: Verdict | null
}

/**
 * Photo-XL swipeable activity card. Gradient at the bottom hosts the title,
 * tags, and a metadata strip (rating · duration · price). The card has no
 * onClick / pointer handler of its own — pointer events are handled by the
 * parent `SwipeDeck`.
 */
export function Card({ activity }: CardProps) {
  const [legendOpen, setLegendOpen] = useState(false)
  return (
    <div
      className="relative h-full w-full overflow-hidden font-sans text-white"
      style={{
        borderRadius: 28,
        background: `url(${heroPhotoUrl(activity)}) center/cover, ${YB.bgSoft}`,
        boxShadow:
          '0 30px 60px -30px rgba(20,30,50,0.45), 0 0 0 1px rgba(20,30,50,0.06)',
      }}
    >
      {/* The hero photo is a CSS background; expose a text alternative for
          screen readers (WCAG 1.1.1). Not role="img" on the card itself — that
          would hide the title/meta children from assistive tech. */}
      <span className="sr-only">Photo : {activity.title}</span>
      {/* N° chip — top-left */}
      <div
        className="absolute flex items-center font-sans"
        style={{ top: 14, left: 14, gap: 6 }}
      >
        <span
          style={{
            background: 'rgba(255,255,255,0.94)',
            color: YB.ink,
            fontWeight: 800,
            fontSize: 12,
            padding: '5px 11px',
            borderRadius: 99,
            letterSpacing: 0.2,
            boxShadow: '0 2px 8px -2px rgba(20,30,50,0.15)',
          }}
        >
          Nº{activity.number.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Tag chips — top-right, tap to toggle the legend */}
      <div
        className="absolute flex flex-col items-end"
        style={{ top: 14, right: 14, gap: 6 }}
      >
        <div className="flex" style={{ gap: 4 }}>
          {activity.tags.slice(0, 3).map((tag, i) => (
            <button
              type="button"
              key={`${tag}-${i}`}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setLegendOpen((v) => !v)
              }}
              aria-label={labelForTag(tag)}
              aria-expanded={legendOpen}
              className="inline-flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: legendOpen ? '#fff' : 'rgba(255,255,255,0.94)',
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
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
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
              {activity.tags.slice(0, 3).map((tag, i) => (
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

      {/* Bottom gradient block — leaves room for the floating action row that
          overlaps the card. */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          padding: '130px 18px 96px',
          background:
            'linear-gradient(180deg, rgba(15,18,28,0) 0%, rgba(15,18,28,0.35) 28%, rgba(15,18,28,0.82) 70%, rgba(15,18,28,0.95) 100%)',
        }}
      >
        <h2
          className="m-0 font-sans"
          style={{
            fontWeight: 700,
            fontSize: 28,
            lineHeight: 1.05,
            letterSpacing: -0.6,
            textShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}
        >
          {activity.title}
        </h2>

        <div
          className="flex items-center flex-wrap"
          style={{
            columnGap: 8,
            rowGap: 4,
            marginTop: 8,
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 500,
          }}
        >
          <span className="inline-flex items-center" style={{ gap: 4 }}>
            <Pin color="rgba(255,255,255,0.9)" size={13} />
            {formatLocation(activity.location)}
          </span>
          {(() => {
            // Approximate drive time from Tamarin, computed from the activity's
            // coordinates. Hidden when no coords — the curated `transit` text is
            // never shown here (it can be a multi-base composite).
            const coords = coordsFor(activity)
            if (!coords) return null
            return (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ fontSize: 12 }}>
                  {estimateDriveTime(coords, BASE_TAMARIN)} depuis Tamarin
                </span>
              </>
            )
          })()}
        </div>

        <p
          className="font-sans"
          style={{
            margin: '12px 0 14px',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.86)',
            fontWeight: 400,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {activity.description}
        </p>

        <div className="font-sans" style={{ paddingTop: 14 }}>
          <div
            className="flex flex-wrap"
            style={{ gap: 8, fontWeight: 700, fontSize: 13.5 }}
          >
            <MetaPill
              icon={<StarFilled color={YB.ink} size={12} />}
              iconBg="rgba(255,203,69,0.85)"
            >
              {formatRating(activity.rating)}
            </MetaPill>

            {activity.duration && (
              <MetaPill
                icon={<Clock color="#fff" size={12} />}
                iconBg="rgba(255,255,255,0.2)"
              >
                {shortDuration(activity.duration)}
              </MetaPill>
            )}

            <MetaPill
              icon={<Wallet color="#fff" size={12} />}
              iconBg="rgba(255,255,255,0.2)"
            >
              {shortPrice(activity.price)}
            </MetaPill>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A metadata pill in the card's bottom strip: a small coloured icon badge
 * followed by a short value (rating · duration · price). The three pills share
 * an identical outer shape (pill padding, dark translucent fill, hairline
 * border); only the icon, its badge colour, and the value differ.
 */
function MetaPill({
  icon,
  iconBg,
  children,
}: {
  icon: ReactNode
  iconBg: string
  children: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 7,
        padding: '7px 13px 7px 9px',
        borderRadius: 99,
        background: 'rgba(20,30,50,0.42)',
        border: '1px solid rgba(255,255,255,0.18)',
        color: '#fff',
      }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          background: iconBg,
        }}
        aria-hidden
      >
        {icon}
      </span>
      {children}
    </span>
  )
}
