import { memo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { AvatarPill } from './AvatarPill.tsx'
import { PARTICIPANTS } from '../data/participants.ts'
import { fakeVote } from '../utils/groupVotes.ts'
import { VERDICT_META } from '../constants/swipe.ts'

/**
 * "Le groupe" panel: gated behind `meDone` — a placeholder until the local
 * user has finished their own deck, then the 9 participants with their
 * (faked, except the local user's real) verdict.
 *
 * `memo`'d: it lives in the always-mounted detail sheet and its props are
 * stable, so it skips the re-renders DetailModal does for its open/armed state.
 */
export const DetailGroupVotes = memo(function DetailGroupVotes({
  activity,
  meDone,
  userId,
  myVerdict,
}: {
  activity: Activity
  meDone: boolean
  userId: string | null
  myVerdict: Verdict | null
}) {
  return (
    <>
      <SectionHeading>Le groupe</SectionHeading>
      {meDone ? (
        <ul
          data-testid="group-votes"
          className="font-sans"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 12,
            background: YB.bgSoft,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
          aria-label="Votes du groupe pour cette activité"
        >
          {PARTICIPANTS.map((p) => {
            const isMe = userId !== null && p.id === userId
            const verdict =
              isMe && myVerdict ? myVerdict : fakeVote(p.id, activity.id)
            const meta = VERDICT_META[verdict]
            return (
              <li
                key={p.id}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '8px 10px',
                  background: YB.surface,
                  borderRadius: 12,
                  fontSize: 14,
                }}
                data-testid={`group-vote-${p.id}`}
              >
                <AvatarPill
                  initial={p.initial}
                  color={p.color}
                  size={28}
                  fontSize={12}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    color: YB.ink,
                  }}
                >
                  {p.name}
                  {isMe && (
                    <span
                      className="font-mono"
                      style={{
                        marginLeft: 6,
                        fontSize: 9.5,
                        letterSpacing: 0.6,
                        padding: '1px 5px',
                        borderRadius: 99,
                        background: YB.ink,
                        color: '#fff',
                        textTransform: 'uppercase',
                        verticalAlign: 'middle',
                      }}
                    >
                      toi
                    </span>
                  )}
                </span>
                <span
                  className="inline-flex items-center font-sans"
                  style={{
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 99,
                    background: `${meta.color}1f`,
                    color: meta.color,
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 12 }}>
                    {meta.emoji}
                  </span>
                  {meta.label}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div
          className="flex items-center font-sans"
          style={{
            padding: 18,
            background: YB.bgSoft,
            borderRadius: 16,
            fontSize: 14,
            color: YB.ink2,
            lineHeight: 1.55,
            gap: 12,
          }}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              background: YB.surface,
              fontSize: 16,
              flexShrink: 0,
            }}
            aria-hidden
          >
            🔒
          </span>
          <span>
            Les votes du groupe apparaîtront ici une fois que tu auras fini ton
            deck.
          </span>
        </div>
      )}
    </>
  )
})
