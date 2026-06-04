import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetailGroupVotes } from './DetailGroupVotes.tsx'
import type { Activity } from '../types/activity.ts'
import type { GroupMember } from '../hooks/useGroupData.ts'

const activity = { id: 'a001', title: 'X' } as Activity

describe('DetailGroupVotes', () => {
  it('shows the locked placeholder until the local user is done', () => {
    render(
      <DetailGroupVotes
        activity={activity}
        meDone={false}
        currentUserId="mathieu"
        myVerdict={null}
      />,
    )
    expect(screen.queryByTestId('group-votes')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Les votes du groupe apparaîtront ici/i),
    ).toBeInTheDocument()
  })

  it('demo mode (no members): lists the 9 participants with their verdicts', () => {
    render(
      <DetailGroupVotes
        activity={activity}
        meDone
        currentUserId="mathieu"
        myVerdict="oui"
      />,
    )
    expect(screen.getByTestId('group-votes').querySelectorAll('li')).toHaveLength(9)
    expect(screen.getByTestId('group-vote-mathieu')).toHaveTextContent('toi')
  })

  it('Google mode: shows only members who voted, with the local verdict overridden', () => {
    const members: GroupMember[] = [
      { uid: 'u-mathieu', name: 'Mathieu', voteCount: 1, votes: { a001: { verdict: 'non' } } },
      { uid: 'u-chloe', name: 'Chloé', voteCount: 1, votes: { a001: { verdict: 'top' } } },
      { uid: 'u-alex', name: 'Alex', voteCount: 0, votes: {} }, // didn't vote on a001
    ]
    render(
      <DetailGroupVotes
        activity={activity}
        meDone
        currentUserId="u-mathieu"
        myVerdict="oui"
        members={members}
      />,
    )
    const rows = screen.getByTestId('group-votes').querySelectorAll('li')
    expect(rows).toHaveLength(2) // Alex omitted (no vote)
    // My own row uses the live local verdict (oui → LIKE), not the stored 'non'.
    const me = screen.getByTestId('group-vote-u-mathieu')
    expect(me).toHaveTextContent('toi')
    expect(me).toHaveTextContent('LIKE')
    expect(screen.getByTestId('group-vote-u-chloe')).toHaveTextContent('SUPER LIKE')
    expect(screen.queryByTestId('group-vote-u-alex')).not.toBeInTheDocument()
  })

  it('Google mode: empty state when nobody has voted on this activity', () => {
    render(
      <DetailGroupVotes
        activity={activity}
        meDone
        currentUserId="u-mathieu"
        myVerdict={null}
        members={[{ uid: 'u-chloe', name: 'Chloé', voteCount: 0, votes: {} }]}
      />,
    )
    expect(screen.queryByTestId('group-votes')).not.toBeInTheDocument()
    expect(screen.getByText(/Personne n'a encore voté/i)).toBeInTheDocument()
  })
})
