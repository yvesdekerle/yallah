import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  it('renders title, location, price, rating', () => {
    render(<Card activity={fixture} />)
    expect(
      screen.getByText('Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
    // formatLocation: trailing "(sud-est)" becomes " · sud-est"
    expect(screen.getByText('Blue Bay · sud-est')).toBeInTheDocument()
    // shortPrice strips "/pers en excursion organisée" from the chip.
    expect(screen.getByText('25–35 €')).toBeInTheDocument()
    // Integer ratings drop the .0 on the Card pill.
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows a computed "depuis Tamarin" drive time when the activity has coords', () => {
    render(
      <Card activity={{ ...fixture, coords: { lat: -20.33, lng: 57.38 } }} />,
    )
    const line = screen.getByText(/depuis Tamarin/)
    // Computed estimate (~Xmin), never the curated free-text.
    expect(line.textContent).toMatch(/~\d.*depuis Tamarin/)
    expect(screen.queryByText('~1h–1h15 depuis Tamarin')).toBeNull()
  })

  it('hides the drive-time line when the activity has no coords', () => {
    render(<Card activity={{ ...fixture, id: 'no-coords-xyz' }} />)
    expect(screen.queryByText(/depuis Tamarin/)).toBeNull()
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

  it('does not show the difficulty label on the Card (moved to the DetailModal NIVEAU tile)', () => {
    render(<Card activity={fixture} />)
    expect(screen.queryByText('Facile')).not.toBeInTheDocument()
  })

  it('does not surface the journée flag on the Card (badge removed pending decision)', () => {
    render(<Card activity={{ ...fixture, journee: true }} />)
    expect(
      screen.queryByLabelText(/journée entière/i),
    ).not.toBeInTheDocument()
  })

  it('does not surface the booking link on the Card (kept in the DetailModal only)', () => {
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

  it('opens a tag legend when a chip is tapped, closes when tapped again', () => {
    render(<Card activity={fixture} />)
    expect(screen.queryByLabelText('Légende des tags')).not.toBeInTheDocument()
    const chip = screen.getByLabelText('Mer & sports nautiques')
    fireEvent.click(chip)
    const panel = screen.getByLabelText('Légende des tags')
    expect(panel).toHaveTextContent('Mer & sports nautiques')
    expect(panel).toHaveTextContent('Faune sauvage')
    fireEvent.click(chip)
    expect(screen.queryByLabelText('Légende des tags')).not.toBeInTheDocument()
  })

  it('exposes the hero photo as a text alternative for screen readers', () => {
    render(<Card activity={fixture} />)
    expect(
      screen.getByText('Photo : Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
  })
})
