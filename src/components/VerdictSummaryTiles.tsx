import type { Verdict } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'
import { YB } from '../utils/theme.ts'

const SUMMARY: { key: Verdict; label: string }[] = [
  { key: 'oui', label: '♥ like' },
  { key: 'top', label: '★ super like' },
  { key: 'whynot', label: '↓ why not' },
  { key: 'non', label: '✕ non' },
]

/** The per-verdict count tiles at the top of the Résultats screen. */
export function VerdictSummaryTiles({
  counts,
}: {
  counts: Record<Verdict, number>
}) {
  return (
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
            background: YB.surface,
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
          >
            {counts[key]}
          </div>
        </div>
      ))}
    </div>
  )
}
