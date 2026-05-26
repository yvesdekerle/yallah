import { useMemo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'
import { YB } from '../utils/theme.ts'
import { VerdictBadge } from './VerdictBadge.tsx'

interface ResultsScreenProps {
  history: VoteEntry[]
  activities: Activity[]
  /** Open the confirm-reset modal (handled at App level). */
  onRequestReset: () => void
  /** Fired when a row is clicked. Parent opens the detail modal. */
  onSelectActivity?: (activity: Activity) => void
}

const SUMMARY: { key: Verdict; label: string }[] = [
  { key: 'oui', label: '♥ oui' },
  { key: 'top', label: '★ super like' },
  { key: 'whynot', label: '↑ why not' },
  { key: 'skip', label: '⊘ plus tard' },
  { key: 'non', label: '✕ non' },
]

interface VotedActivity {
  activity: Activity
  verdict: Verdict
}

/**
 * "Résultats" tab — live recap of the current user's votes.
 *
 * Two parts:
 *   1. Stat tiles (count per verdict)
 *   2. A FLAT list of every activity the user has voted on, ordered by
 *      activity number. Each row's badge takes the shape + colour of the
 *      verdict (heart for oui, star for super-like, coloured circle
 *      otherwise) so the verdict is recognisable at a glance.
 *
 * Tapping a row opens the DetailModal in review mode so the user can
 * inspect the activity or change their vote in 1 extra tap.
 *
 * The reset button delegates to the parent; the confirmation modal is
 * rendered at App level so it isn't clipped by the scroll container.
 */
export function ResultsScreen({
  history,
  activities,
  onRequestReset,
  onSelectActivity,
}: ResultsScreenProps) {
  const counts = useMemo(() => {
    const c: Record<Verdict, number> = {
      oui: 0,
      non: 0,
      whynot: 0,
      top: 0,
      skip: 0,
    }
    for (const h of history) c[h.verdict] += 1
    return c
  }, [history])

  const byId = useMemo(() => {
    const m = new Map<string, Activity>()
    for (const a of activities) m.set(a.id, a)
    return m
  }, [activities])

  /**
   * One entry per voted activity, sorted by activity number. If somehow
   * history has duplicates the LAST vote wins.
   */
  const voted = useMemo<VotedActivity[]>(() => {
    const latest = new Map<string, Verdict>()
    for (const h of history) latest.set(h.id, h.verdict)
    const out: VotedActivity[] = []
    for (const [id, verdict] of latest) {
      const activity = byId.get(id)
      if (activity) out.push({ activity, verdict })
    }
    out.sort((a, b) => a.activity.number - b.activity.number)
    return out
  }, [history, byId])

  return (
    <div
      className="absolute inset-0 z-[1] overflow-y-auto font-sans"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ padding: '0 22px' }}>
        <h1
          className="m-0 font-sans"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}
        >
          Tes votes
        </h1>
        <p
          className="font-sans"
          style={{
            margin: '6px 0 22px',
            fontSize: 13.5,
            color: YB.ink2,
            lineHeight: 1.45,
          }}
        >
          {history.length} / {activities.length} activités swipées.
        </p>

        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 6,
            marginBottom: 24,
          }}
        >
          {SUMMARY.map(({ key, label }) => (
            <div
              key={key}
              className="text-left"
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '10px 8px',
                boxShadow: '0 2px 8px -2px rgba(20,30,50,0.08)',
                minWidth: 0,
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: 9,
                  color: YB.muted,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </div>
              <div
                className="font-sans"
                style={{
                  fontWeight: 800,
                  fontSize: 22,
                  color: VERDICT_META[key].color,
                  marginTop: 2,
                }}
                data-testid={`results-${key}`}
              >
                {counts[key]}
              </div>
            </div>
          ))}
        </div>

        {voted.length === 0 ? (
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
        ) : (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {voted.map(({ activity, verdict }) => {
              const clickable = !!onSelectActivity
              const Tag = clickable ? 'button' : ('div' as const)
              return (
                <Tag
                  key={activity.id}
                  {...(clickable
                    ? {
                        type: 'button' as const,
                        onClick: () => onSelectActivity!(activity),
                        'aria-label': `Voir le détail de ${activity.title}`,
                      }
                    : {})}
                  className="flex items-center font-sans text-left w-full border-0"
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '8px 10px',
                    gap: 12,
                    boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'transform 0.12s, box-shadow 0.12s',
                  }}
                  onMouseDown={
                    clickable
                      ? (e) =>
                          (e.currentTarget.style.transform = 'scale(0.98)')
                      : undefined
                  }
                  onMouseUp={
                    clickable
                      ? (e) => (e.currentTarget.style.transform = 'scale(1)')
                      : undefined
                  }
                  onMouseLeave={
                    clickable
                      ? (e) => (e.currentTarget.style.transform = 'scale(1)')
                      : undefined
                  }
                  data-testid={`vote-row-${activity.id}`}
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
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onRequestReset}
          disabled={history.length === 0}
          className="font-sans cursor-pointer border-0"
          style={{
            marginTop: 32,
            width: '100%',
            padding: '12px 0',
            borderRadius: 99,
            background: history.length === 0 ? 'rgba(20,30,50,0.12)' : YB.ink,
            color: history.length === 0 ? YB.muted : '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
          }}
          aria-label="réinitialiser les votes"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
