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
      'Adé', 'Alex', 'Amly', 'Audrey', 'Chloé', 'July', 'Mathieu', 'Quentin', 'Yves',
    ])
  })

  it('uses the real progress for the local user and masks others until done', () => {
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
    expect(yvesRow).not.toHaveTextContent('64 / 201')
    expect(yvesRow).toHaveTextContent('🔒')
    expect(yvesRow).not.toHaveTextContent('toi')
  })

  it("reveals everyone else's progress once the local user has finished", () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={201}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    const yvesRow = screen.getByTestId('participant-yves')
    expect(yvesRow).toHaveTextContent('64 / 201')
    expect(yvesRow).not.toHaveTextContent('🔒')

    const alexRow = screen.getByTestId('participant-alex')
    expect(alexRow).toHaveTextContent('142 / 201')
  })

  it('shows a lock banner while the local user has not finished', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={37}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByTestId('reveal-lock-banner')).toBeInTheDocument()
  })

  it('hides the lock banner once the local user has finished', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={201}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.queryByTestId('reveal-lock-banner')).not.toBeInTheDocument()
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

  it('shows ✓ fini for a finished participant once everyone is revealed', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={201}
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

  describe('Google mode', () => {
    const googleUser = { sub: '1', name: 'Yves', email: 'yves@example.com' }

    it('prepends a "toi" row for the Google identity with real progress', () => {
      render(
        <GroupScreen
          currentUserId={null}
          currentUserProgress={12}
          total={201}
          onChangeIdentity={noop}
          googleUser={googleUser}
        />,
      )
      const meRow = screen.getByTestId('participant-me-google')
      expect(meRow).toHaveTextContent('Yves')
      expect(meRow).toHaveTextContent('toi')
      expect(meRow).toHaveTextContent('12 / 201')
    })

    it('keeps the 9 hard-coded participants and hides "Changer d\'identité"', () => {
      render(
        <GroupScreen
          currentUserId={null}
          currentUserProgress={12}
          total={201}
          onChangeIdentity={noop}
          googleUser={googleUser}
        />,
      )
      for (const p of PARTICIPANTS) {
        expect(screen.getByTestId(`participant-${p.id}`)).toBeInTheDocument()
      }
      expect(
        screen.queryByRole('button', { name: /changer d'identité/i }),
      ).not.toBeInTheDocument()
    })
  })
})
