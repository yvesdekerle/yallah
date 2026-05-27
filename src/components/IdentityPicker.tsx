import { useEffect } from 'react'
import { PARTICIPANTS } from '../data/participants.ts'
import { YB } from '../utils/theme.ts'

interface IdentityPickerProps {
  currentUserId: string | null
  onPick: (id: string) => void
  /**
   * When undefined the picker is blocking: no close button, Escape and
   * backdrop tap do nothing. Used during onboarding.
   */
  onClose?: () => void
}

export function IdentityPicker({
  currentUserId,
  onPick,
  onClose,
}: IdentityPickerProps) {
  const dismissable = !!onClose

  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose!()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisis ton prénom"
      data-testid="picker-backdrop"
      onClick={dismissable ? () => onClose!() : undefined}
      className="absolute inset-0 z-[40] flex items-end justify-center font-sans"
      style={{
        background: dismissable
          ? 'rgba(20,25,40,0.55)'
          : 'rgba(20,25,40,0.85)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full"
        style={{
          background: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)',
          boxShadow: '0 -10px 30px -10px rgba(20,30,50,0.35)',
          maxHeight: '85%',
          overflowY: 'auto',
        }}
      >
        <div
          className="flex items-center"
          style={{ justifyContent: 'space-between', marginBottom: 4 }}
        >
          <h2
            className="m-0 font-sans"
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: -0.3,
              color: YB.ink,
            }}
          >
            Tu es qui ?
          </h2>
          {dismissable && (
            <button
              type="button"
              onClick={() => onClose!()}
              aria-label="fermer le sélecteur"
              className="font-sans cursor-pointer border-0"
              style={{
                background: 'transparent',
                color: YB.muted,
                fontSize: 22,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <p
          className="font-sans"
          style={{
            margin: '0 0 16px',
            fontSize: 13.5,
            color: YB.ink2,
            lineHeight: 1.45,
          }}
        >
          Choisis ton prénom dans la liste.
        </p>

        <div className="flex flex-col" style={{ gap: 6 }}>
          {PARTICIPANTS.map((p) => {
            const isMe = p.id === currentUserId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                data-testid={`picker-row-${p.id}`}
                className="flex items-center font-sans text-left w-full border-0 cursor-pointer"
                style={{
                  background: isMe ? YB.bgSoft : '#fff',
                  border: `1px solid ${isMe ? YB.ink : 'rgba(20,30,50,0.08)'}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  gap: 12,
                }}
              >
                <span
                  className="inline-flex items-center justify-center font-sans"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 99,
                    background: p.color,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                  aria-hidden
                >
                  {p.initial}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: YB.ink,
                    letterSpacing: -0.2,
                    flex: 1,
                  }}
                >
                  {p.name}
                </span>
                {isMe && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: 0.8,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: YB.ink,
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}
                  >
                    toi
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
