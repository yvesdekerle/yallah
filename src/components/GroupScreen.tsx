import { useMemo } from 'react'
import { PARTICIPANTS } from '../data/participants.ts'
import type { GoogleUser } from '../types/user.ts'
import type { GroupMember } from '../hooks/useGroupData.ts'
import { YB } from '../utils/theme.ts'
import { avatarColor } from '../utils/avatarColor.ts'
import { AvatarPill } from './AvatarPill.tsx'

interface GroupScreenProps {
  /** Id of the participant the local user identifies as (demo mode). Null in
      Google mode or while onboarding is pending. */
  currentUserId: string | null
  /** Number of activities the local user has swiped. */
  currentUserProgress: number
  /** Total number of activities in the deck. */
  total: number
  /** Open the IdentityPicker (demo mode only). */
  onChangeIdentity: () => void
  /** When set (Google mode), the screen shows the real signed-in users (no
      hard-coded participants) and hides "Changer d'identité". */
  googleUser?: GoogleUser | null
  /** Real signed-in members + their votes (Google mode). */
  members?: GroupMember[]
}

/** One participant/identity row: avatar, name, optional "toi" badge, progress
    bar. Shared by the hard-coded participants and the Google "toi" row. */
function ProgressRow({
  testId,
  initial,
  color,
  name,
  isMe,
  reveal,
  progress,
  total,
}: {
  testId: string
  initial: string
  color: string
  name: string
  isMe: boolean
  reveal: boolean
  progress: number
  total: number
}) {
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0
  const isDone = progress >= total && total > 0
  return (
    <div
      className="font-sans yallah-card"
      style={{ padding: '12px 14px' }}
      data-testid={testId}
    >
      <div className="flex items-center" style={{ gap: 14 }}>
        <AvatarPill initial={initial} color={color} size={40} fontSize={16} />
        <div className="flex-1 flex items-baseline" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: YB.ink,
              letterSpacing: -0.2,
            }}
          >
            {name}
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
            color: reveal ? (isDone ? YB.green : YB.muted) : YB.muted,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
          aria-label={
            reveal
              ? `${progress} sur ${total} activités swipées`
              : 'votes masqués'
          }
        >
          {reveal ? (isDone ? '✓ fini' : `${progress} / ${total}`) : '🔒'}
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
        aria-valuenow={reveal ? progress : 0}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: reveal ? `${pct}%` : '0%',
            background: isDone ? YB.green : color,
            borderRadius: 99,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </div>
  )
}

/**
 * "Groupe" tab. Two modes:
 * - **Demo**: the 9 hard-coded participants, progress real for the local user
 *   and faked-but-stable for the others; "Changer d'identité" is shown.
 * - **Google**: the real signed-in users (from the Firestore roster), sorted
 *   alphabetically by first name, with their real vote counts; no hard-coded
 *   names, no "Changer d'identité".
 * Both keep the reveal rule: others' progress is masked until the local user
 * finishes their own deck.
 */
export function GroupScreen({
  currentUserId,
  currentUserProgress,
  total,
  onChangeIdentity,
  googleUser,
  members = [],
}: GroupScreenProps) {
  const meDone = total > 0 && currentUserProgress >= total

  // Google mode: the real signed-in users, sorted alpha by first name, with the
  // current user guaranteed present (the roster write may lag the first render).
  const googleRows = useMemo(() => {
    if (!googleUser) return []
    const withMe = members.some((m) => m.uid === googleUser.uid)
      ? members
      : [
          ...members,
          {
            uid: googleUser.uid,
            name: googleUser.name,
            voteCount: currentUserProgress,
            votes: {},
          },
        ]
    return [...withMe].sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    )
  }, [googleUser, members, currentUserProgress])

  const peopleCount = googleUser ? googleRows.length : PARTICIPANTS.length

  return (
    <div
      className="absolute inset-0 z-[1] overflow-y-auto font-sans"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)',
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
          {peopleCount} personnes pour Maurice — novembre 2026.
        </p>

        {!meDone && (
          <div
            className="flex items-start font-sans yallah-card"
            style={{
              gap: 10,
              padding: '12px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: YB.ink2,
              lineHeight: 1.45,
            }}
            data-testid="reveal-lock-banner"
          >
            <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
              🔒
            </span>
            <span>
              Les votes des autres seront révélés quand tu auras fini ton deck.
            </span>
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 8 }}>
          {googleUser
            ? googleRows.map((m) => {
                const isMe = m.uid === googleUser.uid
                return (
                  <ProgressRow
                    key={m.uid}
                    testId={
                      isMe ? 'participant-me-google' : `participant-g-${m.uid}`
                    }
                    initial={(m.name[0] ?? '?').toUpperCase()}
                    color={isMe ? YB.coral : avatarColor(m.uid)}
                    name={m.name}
                    isMe={isMe}
                    reveal={isMe || meDone}
                    progress={isMe ? currentUserProgress : m.voteCount}
                    total={total}
                  />
                )
              })
            : PARTICIPANTS.map((p) => {
                const isMe = currentUserId !== null && p.id === currentUserId
                return (
                  <ProgressRow
                    key={p.id}
                    testId={`participant-${p.id}`}
                    initial={p.initial}
                    color={p.color}
                    name={p.name}
                    isMe={isMe}
                    reveal={isMe || meDone}
                    progress={isMe ? currentUserProgress : (p.fakeProgress ?? 0)}
                    total={total}
                  />
                )
              })}
        </div>

        {!googleUser && (
          <button
            type="button"
            onClick={onChangeIdentity}
            className="font-sans cursor-pointer"
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px 0',
              borderRadius: 99,
              background: YB.surface,
              color: YB.ink,
              fontWeight: 700,
              fontSize: 14,
              border: `1px solid ${YB.ink}`,
              boxShadow: '0 2px 8px -2px rgba(20,30,50,0.08)',
            }}
          >
            Changer d'identité
          </button>
        )}
      </div>
    </div>
  )
}
