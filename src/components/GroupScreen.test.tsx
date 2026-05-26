import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupScreen } from './GroupScreen.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

describe('GroupScreen', () => {
  it('shows the group headline', () => {
    render(<GroupScreen />)
    expect(screen.getByText('Le groupe')).toBeInTheDocument()
    expect(
      screen.getByText('9 personnes pour Maurice — novembre 2026.'),
    ).toBeInTheDocument()
  })

  it('renders all 9 participants', () => {
    render(<GroupScreen />)
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
  })

  it('participants are listed in alphabetical order', () => {
    render(<GroupScreen />)
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
})
