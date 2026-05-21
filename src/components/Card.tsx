import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { heroPhotoUrl } from '../utils/photos.ts'
import { Pin, Clock, StarFilled } from '../icons/index.tsx'

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
      {/* N° chip — top-left */}
      <div
        className="absolute font-sans"
        style={{
          top: 14,
          left: 14,
          background: 'rgba(255,255,255,0.94)',
          color: YB.ink,
          fontWeight: 800,
          fontSize: 12,
          padding: '5px 11px',
          borderRadius: 99,
          letterSpacing: 0.2,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px -2px rgba(20,30,50,0.15)',
        }}
      >
        Nº{activity.number.toString().padStart(2, '0')}
      </div>

      {/* Tag chips — top-right */}
      <div
        className="absolute flex"
        style={{ top: 14, right: 14, gap: 4 }}
      >
        {activity.tags.slice(0, 3).map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(8px)',
              fontSize: 16,
              boxShadow: '0 2px 8px -2px rgba(20,30,50,0.15)',
            }}
            aria-hidden
          >
            {tag}
          </span>
        ))}
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
          className="flex items-center"
          style={{
            gap: 8,
            marginTop: 8,
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 500,
          }}
        >
          <span className="inline-flex items-center" style={{ gap: 4 }}>
            <Pin color="rgba(255,255,255,0.9)" size={13} />
            {activity.location}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span className="font-mono" style={{ fontSize: 10.5 }}>
            {activity.transit}
          </span>
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

        <div
          className="flex items-center justify-between font-sans"
          style={{
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.16)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            <StarFilled color={YB.primary} size={13} />
            <span>{activity.rating.toFixed(1)}</span>
          </span>
          {activity.duration && (
            <span
              className="inline-flex items-center"
              style={{ gap: 5, color: 'rgba(255,255,255,0.85)' }}
            >
              <Clock color="rgba(255,255,255,0.85)" size={13} />
              {activity.duration}
            </span>
          )}
          <span
            className="font-sans"
            style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}
          >
            {activity.price}
          </span>
        </div>
      </div>
    </div>
  )
}
