import { CURRENT_USER_ID, PARTICIPANTS } from '../data/participants.ts'
import { YB } from '../utils/theme.ts'

interface GroupScreenProps {
  /** Number of activities the local user has swiped. */
  currentUserProgress: number
  /** Total number of activities in the deck. */
  total: number
}

/**
 * "Groupe" tab — hard-coded list of the 9 participants. Each row shows a
 * per-person progress bar: real for the local user, faked-but-stable for
 * the others (until we wire a backend).
 */
export function GroupScreen({ currentUserProgress, total }: GroupScreenProps) {
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
          Le groupe
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
          {PARTICIPANTS.length} personnes pour Maurice — novembre 2026.
        </p>

        <div className="flex flex-col" style={{ gap: 8 }}>
          {PARTICIPANTS.map((p) => {
            const isMe = p.id === CURRENT_USER_ID
            const progress = isMe
              ? currentUserProgress
              : (p.fakeProgress ?? 0)
            const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0
            const isDone = progress >= total && total > 0
            return (
              <div
                key={p.id}
                className="font-sans"
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px 14px',
                  boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
                }}
                data-testid={`participant-${p.id}`}
              >
                <div className="flex items-center" style={{ gap: 14 }}>
                  <span
                    className="inline-flex items-center justify-center font-sans"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      background: p.color,
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 800,
                      flexShrink: 0,
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                    aria-hidden
                  >
                    {p.initial}
                  </span>
                  <div
                    className="flex-1 flex items-baseline"
                    style={{ gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: YB.ink,
                        letterSpacing: -0.2,
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
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      color: isDone ? YB.green : YB.muted,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                    aria-label={`${progress} sur ${total} activités swipées`}
                  >
                    {isDone ? '✓ fini' : `${progress} / ${total}`}
                  </span>
                </div>

                <div
                  className="relative overflow-hidden"
                  style={{
                    marginTop: 10,
                    height: 6,
                    borderRadius: 99,
                    background: 'rgba(20,30,50,0.08)',
                  }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={progress}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${pct}%`,
                      background: isDone ? YB.green : p.color,
                      borderRadius: 99,
                      transition: 'width 0.3s ease-out',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
