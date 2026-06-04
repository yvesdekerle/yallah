import { memo } from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import type { GroupMember } from '../hooks/useGroupData.ts'
import { YB } from '../utils/theme.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { AvatarPill } from './AvatarPill.tsx'
import { PARTICIPANTS } from '../data/participants.ts'
import { fakeVote } from '../utils/groupVotes.ts'
import { avatarColor } from '../utils/avatarColor.ts'
import { VERDICT_META } from '../constants/swipe.ts'

interface VoteItem {
  id: string
  name: string
  initial: string
  color: string
  isMe: boolean
  verdict: Verdict
}

/**
 * "Le groupe" panel: gated behind `meDone` — a placeholder until the local user
 * has finished their own deck, then each person's verdict for this activity.
 *
 * Two modes:
 * - **Demo** (`members` null): the 9 participants with faked verdicts (the local
 *   user's own verdict is real).
 * - **Google** (`members` provided): only the real signed-in users who actually
 *   voted on this activity, with their real verdicts.
 *
 * `memo`'d: it lives in the always-mounted detail sheet and its props are
 * stable, so it skips the re-renders DetailModal does for its open/armed state.
 */
export const DetailGroupVotes = memo(function DetailGroupVotes({
  activity,
  meDone,
  currentUserId,
  myVerdict,
  members = null,
}: {
  activity: Activity
  meDone: boolean
  currentUserId: string | null
  myVerdict: Verdict | null
  /** Real signed-in members + votes (Google mode); null in demo mode. */
  members?: GroupMember[] | null
}) {
  const items: VoteItem[] = members
    ? members.flatMap((m) => {
        const isMe = m.uid === currentUserId
        const verdict =
          isMe && myVerdict ? myVerdict : m.votes[activity.id]?.verdict
        if (!verdict) return []
        return [
          {
            id: m.uid,
            name: m.name,
            initial: (m.name[0] ?? '?').toUpperCase(),
            color: isMe ? YB.coral : avatarColor(m.uid),
            isMe,
            verdict,
          },
        ]
      })
    : PARTICIPANTS.map((p) => {
        const isMe = currentUserId !== null && p.id === currentUserId
        return {
          id: p.id,
          name: p.name,
          initial: p.initial,
          color: p.color,
          isMe,
          verdict: isMe && myVerdict ? myVerdict : fakeVote(p.id, activity.id),
        }
      })

  return (
    <>
      <SectionHeading>Le groupe</SectionHeading>
      {!meDone ? (
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
      ) : items.length === 0 ? (
        <div
          className="font-sans"
          style={{
            padding: 18,
            background: YB.bgSoft,
            borderRadius: 16,
            fontSize: 14,
            color: YB.ink2,
          }}
        >
          Personne n'a encore voté sur cette activité.
        </div>
      ) : (
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
          {items.map((it) => {
            const meta = VERDICT_META[it.verdict]
            return (
              <li
                key={it.id}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '8px 10px',
                  background: YB.surface,
                  borderRadius: 12,
                  fontSize: 14,
                }}
                data-testid={`group-vote-${it.id}`}
              >
                <AvatarPill
                  initial={it.initial}
                  color={it.color}
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
                  {it.name}
                  {it.isMe && (
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
      )}
    </>
  )
})
