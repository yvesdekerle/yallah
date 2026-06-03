import { type ReactNode } from 'react'
import type { Activity } from '../types/activity.ts'
import { YB } from '../utils/theme.ts'
import { Clock, Wallet, StarFilled } from '../icons/index.tsx'
import { ratingComment } from '../utils/rating.ts'
import { getReviewSummary } from '../utils/reviewSummary.ts'
import { shortPrice, formatRating } from '../utils/format.ts'
import { DifficultyWarning } from './DifficultyWarning.tsx'
import { DriveTimes } from './DriveTimes.tsx'

function MetaTile({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div
      className="flex flex-col items-center font-sans"
      style={{ gap: 6, padding: '4px 6px', minWidth: 0 }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 99,
          background: iconBg,
          flexShrink: 0,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: 9.5,
          letterSpacing: 0.9,
          color: YB.muted,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: YB.ink,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Everything "about" the activity that sits above the description: the
 * difficulty warning (hard/very-hard only), the 4-tile meta grid, the rating
 * justification line, and the drive-time block from the two villa bases.
 */
export function DetailMetaTiles({ activity }: { activity: Activity }) {
  return (
    <>
      <DifficultyWarning activity={activity} />

      {/* Meta tiles — Durée / Niveau / Note / Prix in a 4-column grid */}
      <div
        className="font-sans"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          marginBottom: 18,
          padding: '14px 8px',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 2px 10px -4px rgba(20,30,50,0.08)',
        }}
        aria-label="Caractéristiques de l'activité"
      >
        <MetaTile
          icon={<Clock color={YB.bgLagoon} size={20} />}
          iconBg={`${YB.bgLagoon}33`}
          label="Durée"
          value={activity.duration ?? '—'}
        />
        <MetaTile
          icon={
            activity.difficulty ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: activity.difficulty.dot,
                  display: 'inline-block',
                }}
                aria-hidden
              />
            ) : (
              <span aria-hidden />
            )
          }
          iconBg={
            activity.difficulty
              ? `${activity.difficulty.dot}22`
              : `${YB.muted}22`
          }
          label="Niveau"
          value={activity.difficulty?.label ?? '—'}
        />
        <MetaTile
          icon={<StarFilled color={YB.top} size={20} />}
          iconBg={`${YB.top}26`}
          label="Note"
          value={formatRating(activity.rating)}
        />
        <MetaTile
          icon={<Wallet color={YB.bgPistachio} size={20} />}
          iconBg={`${YB.bgPistachio}55`}
          label="Prix"
          value={shortPrice(activity.price)}
        />
      </div>

      {(() => {
        const summary =
          getReviewSummary(activity.id) ?? ratingComment(activity.rating)
        if (!summary) return null
        return (
          <div
            className="flex font-sans"
            style={{
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 22,
              fontSize: 13.5,
              fontStyle: 'italic',
              color: YB.ink2,
              lineHeight: 1.45,
            }}
            aria-label="Justification de la note"
          >
            <span style={{ marginTop: 2, flexShrink: 0 }} aria-hidden>
              <StarFilled color={YB.top} size={14} />
            </span>
            <span>
              <strong style={{ fontStyle: 'normal', color: YB.ink }}>
                {formatRating(activity.rating)}/5
              </strong>{' '}
              · {summary}
            </span>
          </div>
        )
      })()}

      <DriveTimes activity={activity} />
    </>
  )
}
