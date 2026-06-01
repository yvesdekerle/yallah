import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card.tsx'
import type { Activity } from '../types/activity.ts'

const fixture: Activity = {
  id: 'a001',
  number: 1,
  title: 'Snorkeling à Blue Bay Marine Park',
  tags: ['🌊', '🐅'],
  category: '🌊 Mer & Sports nautiques',
  location: 'Blue Bay (sud-est)',
  transit: '~1h–1h15',
  description:
    'Parc marin protégé, visibilité 20–30 m, plus de 50 espèces de coraux.',
  duration: '~3–4h',
  difficulty: { dot: '#22C268', label: 'Facile' },
  price: '~25–35 €/pers',
  rating: 5,
  pepite: false,
  secret: false,
}

describe('Card', () => {
  it('renders title, location, transit, price, rating', () => {
    render(<Card activity={fixture} />)
    expect(
      screen.getByText('Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
    expect(screen.getByText('Blue Bay (sud-est)')).toBeInTheDocument()
    expect(screen.getByText('~1h–1h15')).toBeInTheDocument()
    expect(screen.getByText('~25–35 €/pers')).toBeInTheDocument()
    expect(screen.getByText('5.0')).toBeInTheDocument()
  })

  it('renders the activity number as a zero-padded chip', () => {
    render(<Card activity={fixture} />)
    expect(screen.getByText('Nº01')).toBeInTheDocument()
  })

  it('omits the duration block when no duration is set', () => {
    const noDuration: Activity = { ...fixture, duration: undefined }
    render(<Card activity={noDuration} />)
    expect(screen.queryByText('~3–4h')).not.toBeInTheDocument()
  })

  it('shows the difficulty label inline in the meta strip', () => {
    render(<Card activity={fixture} />)
    expect(screen.getByText('Facile')).toBeInTheDocument()
  })

  it('omits the difficulty block when no difficulty is set', () => {
    const noDiff: Activity = { ...fixture, difficulty: undefined }
    render(<Card activity={noDiff} />)
    expect(screen.queryByText('Facile')).not.toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<Card activity={fixture} />)
    expect(screen.getByText('🌊')).toBeInTheDocument()
    expect(screen.getByText('🐅')).toBeInTheDocument()
  })
})
