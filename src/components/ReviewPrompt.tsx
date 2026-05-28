import { YB } from '../utils/theme.ts'

interface ReviewPromptProps {
  /** Enter review mode (re-walk the deck to adjust votes). */
  onConfirm: () => void
}

/**
 * Pop-in shown over the deck once every activity has a vote. The cards stay
 * visible (dimmed) behind it so the screen never looks empty; the scrim also
 * blocks accidental swipes until the user chooses to review.
 */
export function ReviewPrompt({ onConfirm }: ReviewPromptProps) {
  return (
    <div
      data-testid="review-prompt"
      className="absolute inset-0 z-[15] flex items-center justify-center font-sans"
      style={{ background: 'rgba(20,25,40,0.35)', padding: '0 28px' }}
    >
      <div
        className="text-center"
        style={{
          background: YB.paper,
          borderRadius: 24,
          padding: '28px 24px',
          width: '100%',
          maxWidth: 320,
          boxShadow: '0 24px 60px -20px rgba(20,30,50,0.5)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }} aria-hidden>
          🎉
        </div>
        <h2
          className="m-0"
          style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: YB.ink }}
        >
          Revoir les votes ?
        </h2>
        <p style={{ margin: '8px 0 20px', fontSize: 13.5, color: YB.ink2, lineHeight: 1.5 }}>
          T’as voté sur toutes les activités. Repasse le deck pour ajuster tes
          choix.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="border-0 cursor-pointer"
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 99,
            background: YB.coral,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 6px 16px -4px rgba(255,107,71,0.4)',
          }}
          aria-label="revoir les votes"
        >
          OK
        </button>
      </div>
    </div>
  )
}
