import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupScreen } from './GroupScreen.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

const noop = () => {}

describe('GroupScreen', () => {
  it('shows the group headline', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByText('Le groupe')).toBeInTheDocument()
    expect(
      screen.getByText('9 personnes pour Maurice — novembre 2026.'),
    ).toBeInTheDocument()
  })

  it('renders all 9 participants in alphabetical order', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
    expect(PARTICIPANTS.map((p) => p.name)).toEqual([
      'Adé', 'Alex', 'Amély', 'Audrey', 'Chloé', 'July', 'Mathieu', 'Quentin', 'Yves',
    ])
  })

  it('uses the real progress for the currentUserId, fake for everyone else', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={37}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    const chloeRow = screen.getByTestId('participant-chloe')
    expect(chloeRow).toHaveTextContent('37 / 201')
    expect(chloeRow).toHaveTextContent('toi')

    const yvesRow = screen.getByTestId('participant-yves')
    expect(yvesRow).toHaveTextContent('0 / 201')
    expect(yvesRow).not.toHaveTextContent('toi')

    const alexRow = screen.getByTestId('participant-alex')
    expect(alexRow).toHaveTextContent('142 / 201')
  })

  it('shows no "toi" badge when currentUserId is null', () => {
    render(
      <GroupScreen
        currentUserId={null}
        currentUserProgress={50}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    for (const p of PARTICIPANTS) {
      const row = screen.getByTestId(`participant-${p.id}`)
      expect(row).not.toHaveTextContent('toi')
    }
  })

  it('shows ✓ fini when a participant reached the total', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByTestId('participant-audrey')).toHaveTextContent('fini')
  })

  it('shows ✓ fini for the local user once they finish the deck', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={201}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByTestId('participant-chloe')).toHaveTextContent('fini')
  })

  it('renders a "Changer d\'identité" button and fires the callback', () => {
    const onChangeIdentity = vi.fn()
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={onChangeIdentity}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /changer d'identité/i }))
    expect(onChangeIdentity).toHaveBeenCalledTimes(1)
  })
})
