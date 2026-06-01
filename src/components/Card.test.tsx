import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../utils/links.ts', () => ({
  getLinks: (activityId: string) =>
    activityId === 'with-link'
      ? [{ url: 'https://example.com', label: 'Site officiel' }]
      : [],
}))

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

  it('shows a "Journée" chip when the activity is a full-day destination', () => {
    render(<Card activity={{ ...fixture, journee: true }} />)
    expect(
      screen.getByLabelText(/journée entière/i),
    ).toBeInTheDocument()
  })

  it('omits the "Journée" chip when journee is false', () => {
    render(<Card activity={fixture} />)
    expect(
      screen.queryByLabelText(/journée entière/i),
    ).not.toBeInTheDocument()
  })

  it('renders the primary link as a CTA below the meta strip', () => {
    render(<Card activity={{ ...fixture, id: 'with-link' }} />)
    const link = screen.getByRole('link', { name: /Ouvrir Site officiel/i })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('Site officiel')
  })

  it('omits the link CTA when the activity has no links', () => {
    render(<Card activity={fixture} />)
    expect(
      screen.queryByRole('link', { name: /^Ouvrir/i }),
    ).not.toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<Card activity={fixture} />)
    expect(screen.getByText('🌊')).toBeInTheDocument()
    expect(screen.getByText('🐅')).toBeInTheDocument()
  })
})
