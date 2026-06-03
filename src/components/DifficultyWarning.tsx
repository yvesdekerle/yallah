import type { Activity } from '../types/activity.ts'
import { YB } from '../utils/theme.ts'

/**
 * Amber "be careful" note shown above the meta tiles for the two hardest
 * difficulty levels only. Self-gating: renders nothing otherwise.
 */
export function DifficultyWarning({ activity }: { activity: Activity }) {
  const difficulty = activity.difficulty
  if (
    !difficulty ||
    (difficulty.label !== 'Difficile' && difficulty.label !== 'Très difficile')
  ) {
    return null
  }
  return (
    <div
      role="note"
      aria-label={`Avertissement difficulté: ${difficulty.label}`}
      className="flex font-sans"
      style={{
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        marginBottom: 22,
        background: `${difficulty.dot}14`,
        border: `1px solid ${difficulty.dot}33`,
        borderLeft: `4px solid ${difficulty.dot}`,
        borderRadius: 12,
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }} aria-hidden>
        ⚠️
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: difficulty.dot,
            marginBottom: 2,
            letterSpacing: -0.1,
          }}
        >
          {difficulty.label}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.4, color: YB.ink2 }}>
          {difficulty.detail
            ? difficulty.detail.charAt(0).toUpperCase() +
              difficulty.detail.slice(1)
            : 'Bonne condition physique requise.'}
        </div>
      </div>
    </div>
  )
}
