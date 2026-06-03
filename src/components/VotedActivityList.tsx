import { memo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { VerdictBadge } from './VerdictBadge.tsx'

export interface VotedActivity {
  activity: Activity
  verdict: Verdict
}

/**
 * A single voted-activity row: verdict badge + title, tappable to open detail.
 *
 * `memo`'d so the whole (potentially ~200-row) list doesn't reconcile when the
 * Résultats screen re-renders. The press-feedback scale is pure CSS
 * (`active:scale-…`) rather than imperative onMouseDown/Up/Leave handlers — no
 * per-row closures recreated each render, and it works for touch too.
 */
const VotedActivityRow = memo(function VotedActivityRow({
  activity,
  verdict,
  onSelect,
}: {
  activity: Activity
  verdict: Verdict
  onSelect?: ((activity: Activity) => void) | undefined
}) {
  const clickable = !!onSelect
  const Tag = clickable ? 'button' : ('div' as const)
  return (
    <Tag
      {...(clickable
        ? {
            type: 'button' as const,
            onClick: () => onSelect!(activity),
            'aria-label': `Voir le détail de ${activity.title}`,
          }
        : {})}
      className={`flex items-center font-sans text-left w-full border-0${
        clickable ? ' active:scale-[0.98]' : ''
      }`}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '8px 10px',
        gap: 12,
        boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
    >
      <VerdictBadge verdict={verdict} number={activity.number} />
      <span
        style={{
          fontSize: 14,
          lineHeight: 1.3,
          color: YB.ink,
          fontWeight: 500,
          flex: 1,
          minWidth: 0,
        }}
      >
        {activity.title}
      </span>
      {clickable && (
        <span
          style={{ color: YB.muted, fontSize: 18, flexShrink: 0 }}
          aria-hidden
        >
          ›
        </span>
      )}
    </Tag>
  )
})

/**
 * Flat list of every voted activity (sorted upstream by activity number), or a
 * friendly empty state when nothing's been voted yet. Tapping a row asks the
 * parent to open the detail modal in review mode.
 */
export function VotedActivityList({
  voted,
  onSelectActivity,
}: {
  voted: VotedActivity[]
  onSelectActivity?: ((activity: Activity) => void) | undefined
}) {
  if (voted.length === 0) {
    return (
      <div
        className="font-sans"
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: 18,
          fontSize: 14,
          color: YB.ink2,
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        Rien encore. Va swiper quelques activités, ça apparaîtra ici.
      </div>
    )
  }
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {voted.map(({ activity, verdict }) => (
        <VotedActivityRow
          key={activity.id}
          activity={activity}
          verdict={verdict}
          onSelect={onSelectActivity}
        />
      ))}
    </div>
  )
}
