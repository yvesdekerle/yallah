import type { VoteEntry, Verdict } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'
import { YB } from '../utils/theme.ts'

interface DeckDoneProps {
  history: VoteEntry[]
  bg: string
  onReset: () => void
}

const SUMMARY_ENTRIES: { key: Verdict; label: string }[] = [
  { key: 'oui', label: '♥ oui' },
  { key: 'top', label: '★ super like' },
  { key: 'neutre', label: '↑ why not' },
  { key: 'non', label: '✕ non' },
]

/**
 * End-of-deck celebration. Shows a small recap and a "restart" button.
 */
export function DeckDone({ history, bg, onReset }: DeckDoneProps) {
  const counts: Record<Verdict, number> = { oui: 0, non: 0, neutre: 0, top: 0 }
  for (const h of history) {
    if (h.verdict === 'oui' && h.quotaHit) {
      // Quota-converted super-likes still show as "oui" in the recap; we
      // could split them out later if needed.
    }
    counts[h.verdict] += 1
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center font-sans"
      style={{ background: bg, padding: '0 28px', color: YB.ink }}
    >
      <div style={{ fontSize: 64, marginBottom: 12 }} aria-hidden>
        🎉
      </div>
      <h1
        className="m-0 font-sans"
        style={{
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -0.6,
        }}
      >
        Yallah, t'as tout fait !
      </h1>
      <p
        className="font-sans"
        style={{
          margin: '10px 0 24px',
          fontSize: 13.5,
          color: YB.ink2,
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        Tes votes sont enregistrés en local. Montre l'écran aux autres pour
        comparer vos coups de cœur.
      </p>

      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          width: '100%',
          maxWidth: 280,
          marginBottom: 24,
        }}
      >
        {SUMMARY_ENTRIES.map(({ key, label }) => (
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
              data-testid={`summary-${key}`}
            >
              {counts[key]}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="font-sans border-0 cursor-pointer"
        style={{
          background: YB.ink,
          color: '#fff',
          padding: '12px 22px',
          borderRadius: 99,
          fontWeight: 700,
          fontSize: 14,
          boxShadow: '0 6px 16px -4px rgba(20,30,50,0.3)',
        }}
      >
        Recommencer
      </button>
    </div>
  )
}
