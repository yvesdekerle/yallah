import { useMemo } from 'react'
import { coordsFor } from '../utils/coords.ts'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { VerdictSummaryTiles } from './VerdictSummaryTiles.tsx'
import { VotedActivityList, type VotedActivity } from './VotedActivityList.tsx'

interface ResultsScreenProps {
  history: VoteEntry[]
  activities: Activity[]
  /** Open the confirm-reset modal (handled at App level). */
  onRequestReset: () => void
  /** Fired when a row is clicked. Parent opens the detail modal. */
  onSelectActivity?: (activity: Activity) => void
  /**
   * Re-balayage entry point: hand control to the parent so it can switch
   * back to the Swipe tab in review mode (cards with previous votes show
   * a banner + "=" button to confirm). Optional — when undefined the
   * action button is hidden.
   */
  onReview?: () => void
  /** True when the deck is currently in review mode (changes button copy). */
  reviewing?: boolean
  /** Fire a confirmation prompt to randomly fill un-voted activities. */
  onRequestRandomFill?: () => void
  /** Open the FullscreenMap with all LIKE/SUPER_LIKE pins. */
  onOpenMap?: () => void
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
  onReview,
  reviewing = false,
  onRequestRandomFill,
  onOpenMap,
}: ResultsScreenProps) {
  const remaining = activities.length - history.length
  const counts = useMemo(() => {
    const c: Record<Verdict, number> = {
      oui: 0,
      non: 0,
      whynot: 0,
      top: 0,
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

  const mappablePins = useMemo(
    () =>
      voted.filter(
        ({ activity, verdict }) =>
          (verdict === 'oui' || verdict === 'top') &&
          coordsFor(activity) !== null,
      ),
    [voted],
  )
  const missingLocations = useMemo(
    () =>
      voted.filter(
        ({ activity, verdict }) =>
          (verdict === 'oui' || verdict === 'top') &&
          coordsFor(activity) === null,
      ).length,
    [voted],
  )

  return (
    <div
      className="absolute inset-0 z-[1] overflow-y-auto font-sans"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        // Banner is safe-area-inset-top + 60. Add 16px breathing room.
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)',
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

        <VerdictSummaryTiles counts={counts} />

        {onOpenMap && mappablePins.length > 0 && (
          <>
            <button
              type="button"
              onClick={onOpenMap}
              className="font-sans cursor-pointer border-0"
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 99,
                background: YB.coral,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                marginBottom: missingLocations > 0 ? 6 : 18,
                boxShadow: '0 6px 16px -4px rgba(255,107,71,0.4)',
              }}
              aria-label="voir sur la carte"
            >
              🗺 Voir sur la carte ({mappablePins.length})
            </button>
            {missingLocations > 0 && (
              <p
                className="font-sans"
                style={{
                  margin: '0 0 18px',
                  fontSize: 12,
                  color: YB.muted,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                {missingLocations} activité{missingLocations > 1 ? 's' : ''} sans
                localisation précise non affichée
                {missingLocations > 1 ? 's' : ''}.
              </p>
            )}
          </>
        )}

        <VotedActivityList voted={voted} onSelectActivity={onSelectActivity} />

        {onReview && history.length > 0 && (
          <button
            type="button"
            onClick={onReview}
            className="font-sans cursor-pointer border-0"
            style={{
              marginTop: 32,
              width: '100%',
              padding: '12px 0',
              borderRadius: 99,
              background: YB.coral,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 6px 16px -4px rgba(255,107,71,0.4)',
            }}
            aria-label="revoir mes votes"
          >
            {reviewing ? 'Continuer la révision' : 'Revoir mes votes'}
          </button>
        )}

        {onRequestRandomFill && remaining > 0 && (
          <button
            type="button"
            onClick={onRequestRandomFill}
            className="font-sans cursor-pointer border-0"
            style={{
              marginTop:
                onReview && history.length > 0 ? 10 : 32,
              width: '100%',
              padding: '12px 0',
              borderRadius: 99,
              background: YB.surface,
              color: YB.ink,
              fontWeight: 700,
              fontSize: 14,
              border: `1px solid ${YB.ink}`,
              boxShadow: '0 2px 8px -2px rgba(20,30,50,0.08)',
            }}
            aria-label="remplir aléatoirement les activités restantes"
          >
            🎲 Remplir aléatoirement ({remaining})
          </button>
        )}

        <button
          type="button"
          onClick={onRequestReset}
          disabled={history.length === 0}
          className="font-sans cursor-pointer border-0"
          style={{
            marginTop:
              (onReview && history.length > 0) ||
              (onRequestRandomFill && remaining > 0)
                ? 10
                : 32,
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
          Réinitialiser les votes
        </button>
      </div>
    </div>
  )
}
