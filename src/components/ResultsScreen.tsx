import { useMemo, useState } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'
import { YB } from '../utils/theme.ts'
import { ConfirmModal } from './ConfirmModal.tsx'
import { StarFilled } from '../icons/index.tsx'

interface ResultsScreenProps {
  history: VoteEntry[]
  activities: Activity[]
  onReset: () => void
}

const SUMMARY: { key: Verdict; label: string }[] = [
  { key: 'oui', label: '♥ oui' },
  { key: 'top', label: '★ super like' },
  { key: 'neutre', label: '↑ why not' },
  { key: 'non', label: '✕ non' },
]

/**
 * "Résultats" tab — live recap of the current user's votes plus a reset
 * button gated behind a confirmation modal.
 */
export function ResultsScreen({
  history,
  activities,
  onReset,
}: ResultsScreenProps) {
  const [confirming, setConfirming] = useState(false)

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { oui: 0, non: 0, neutre: 0, top: 0 }
    for (const h of history) c[h.verdict] += 1
    return c
  }, [history])

  const byId = useMemo(() => {
    const m = new Map<string, Activity>()
    for (const a of activities) m.set(a.id, a)
    return m
  }, [activities])

  // Activities the user super-liked (excluding quota-converted "oui"s, since
  // those weren't really intended as super-likes).
  const superLikes = useMemo(
    () =>
      history
        .filter((h) => h.verdict === 'top')
        .map((h) => byId.get(h.id))
        .filter((a): a is Activity => a !== undefined),
    [history, byId],
  )

  const likes = useMemo(
    () =>
      history
        .filter((h) => h.verdict === 'oui')
        .map((h) => byId.get(h.id))
        .filter((a): a is Activity => a !== undefined),
    [history, byId],
  )

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
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {SUMMARY.map(({ key, label }) => (
            <div
              key={key}
              className="text-left"
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: '0 2px 8px -2px rgba(20,30,50,0.08)',
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: YB.muted,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </div>
              <div
                className="font-sans"
                style={{
                  fontWeight: 800,
                  fontSize: 24,
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

        {superLikes.length > 0 && (
          <ResultsSection
            title="Tes super-likes"
            icon={<StarFilled color={YB.top} size={14} />}
            activities={superLikes}
            accentColor={YB.top}
          />
        )}

        {likes.length > 0 && (
          <ResultsSection
            title="Tes oui"
            icon={<span style={{ fontSize: 14, color: YB.oui }}>♥</span>}
            activities={likes}
            accentColor={YB.oui}
          />
        )}

        {history.length === 0 && (
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
        )}

        <button
          type="button"
          onClick={() => setConfirming(true)}
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

      {confirming && (
        <ConfirmModal
          title="Tout effacer ?"
          message="Tes votes en cours seront supprimés. Cette action est irréversible."
          confirmLabel="Tout effacer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={() => {
            onReset()
            setConfirming(false)
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

interface ResultsSectionProps {
  title: string
  icon: React.ReactNode
  activities: Activity[]
  accentColor: string
}

function ResultsSection({
  title,
  icon,
  activities,
  accentColor,
}: ResultsSectionProps) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div
        className="flex items-baseline"
        style={{ gap: 8, marginBottom: 12 }}
      >
        <h2
          className="m-0 font-sans"
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: -0.3,
            color: YB.ink,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {icon}
          {title}
        </h2>
        <span
          className="font-sans"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#9A93A6',
          }}
        >
          {activities.length}
        </span>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-center font-sans"
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '10px 12px',
              gap: 10,
              boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
            }}
          >
            <span
              className="inline-flex items-center justify-center font-mono"
              style={{
                width: 28,
                height: 28,
                borderRadius: 99,
                background: accentColor,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {a.number.toString().padStart(2, '0')}
            </span>
            <span
              style={{
                fontSize: 13.5,
                lineHeight: 1.3,
                color: YB.ink,
                fontWeight: 500,
              }}
            >
              {a.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
