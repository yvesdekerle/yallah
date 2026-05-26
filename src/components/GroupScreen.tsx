import { PARTICIPANTS } from '../data/participants.ts'
import { YB } from '../utils/theme.ts'

/**
 * "Groupe" tab — hard-coded list of the 9 participants. Will move to
 * Google-auth-backed data when we wire a backend.
 */
export function GroupScreen() {
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
          {PARTICIPANTS.map((p) => (
            <div
              key={p.id}
              className="flex items-center font-sans"
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                gap: 14,
                boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
              }}
            >
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
