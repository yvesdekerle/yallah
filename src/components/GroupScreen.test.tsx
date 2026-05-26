import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupScreen } from './GroupScreen.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

describe('GroupScreen', () => {
  it('shows the group headline', () => {
    render(<GroupScreen currentUserProgress={0} total={201} />)
    expect(screen.getByText('Le groupe')).toBeInTheDocument()
    expect(
      screen.getByText('9 personnes pour Maurice — novembre 2026.'),
    ).toBeInTheDocument()
  })

  it('renders all 9 participants', () => {
    render(<GroupScreen currentUserProgress={0} total={201} />)
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
  })

  it('participants are listed in alphabetical order', () => {
    render(<GroupScreen currentUserProgress={0} total={201} />)
    expect(PARTICIPANTS.map((p) => p.name)).toEqual([
      'Adé',
      'Alex',
      'Amély',
      'Audrey',
      'Chloé',
      'July',
      'Mathieu',
      'Quentin',
      'Yves',
    ])
  })

  it('uses the local user progress for Yves, fake values for everyone else', () => {
    render(<GroupScreen currentUserProgress={37} total={201} />)
    const yvesRow = screen.getByTestId('participant-yves')
    expect(yvesRow).toHaveTextContent('37 / 201')
    expect(yvesRow).toHaveTextContent('toi')

    const aleRow = screen.getByTestId('participant-alex')
    expect(aleRow).toHaveTextContent('142 / 201')
  })

  it('shows ✓ fini when a participant reached the total', () => {
    render(<GroupScreen currentUserProgress={0} total={201} />)
    // Audrey is hard-coded at fakeProgress=201 == total.
    expect(screen.getByTestId('participant-audrey')).toHaveTextContent('fini')
  })

  it('shows ✓ fini for the local user once they finish the deck', () => {
    render(<GroupScreen currentUserProgress={201} total={201} />)
    expect(screen.getByTestId('participant-yves')).toHaveTextContent('fini')
  })
})
