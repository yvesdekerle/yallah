import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="leaflet-marker">{children}</div>
  ),
}))

vi.mock('../utils/links.ts', () => ({
  getLinks: (activityId: string) =>
    activityId === 'a042'
      ? [
          { url: 'https://example.com', label: 'Site officiel' },
          { url: 'https://example.com/booking' },
        ]
      : [],
}))

import { DetailModal } from './DetailModal.tsx'
import type { Activity } from '../types/activity.ts'

const fixture: Activity = {
  id: 'a001',
  number: 1,
  title: 'Snorkeling à Blue Bay Marine Park',
  tags: ['🌊', '🐅'],
  category: '🌊 Mer & Sports nautiques',
  location: 'Blue Bay',
  transit: '~1h',
  description: 'Parc marin protégé.',
  duration: '~3–4h',
  difficulty: { dot: '#22C268', label: 'Facile' },
  price: '25 €',
  rating: 5,
  pepite: false,
  secret: false,
}

describe('DetailModal', () => {
  it('renders the title, location, description, meta chips', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(
      screen.getByText('Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
    expect(screen.getByText('Blue Bay')).toBeInTheDocument()
    expect(screen.getByText('Parc marin protégé.')).toBeInTheDocument()
    expect(screen.getByText('~3–4h')).toBeInTheDocument()
    expect(screen.getByText('Facile')).toBeInTheDocument()
    expect(screen.getByText('25 €')).toBeInTheDocument()
  })

  it('renders an Insolite section when the activity has one', () => {
    render(
      <DetailModal
        activity={{ ...fixture, insolite: 'Très rare !' }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.getByText('Anecdote')).toBeInTheDocument()
    expect(screen.getByText('Très rare !')).toBeInTheDocument()
  })

  it('omits the Insolite section when not provided', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.queryByText('Anecdote')).not.toBeInTheDocument()
  })

  it('triggers close after a small delay when clicking the X button', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <DetailModal
        activity={fixture}
        onClose={onClose}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    fireEvent.click(screen.getByLabelText('fermer'))
    vi.advanceTimersByTime(500)
    expect(onClose).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('changing the active pagination dot updates aria-selected', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    // 12 photo dots — click the 3rd one.
    const dots = screen.getAllByRole('tab')
    expect(dots.length).toBe(12)
    expect(dots[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(dots[2]!)
    expect(dots[2]).toHaveAttribute('aria-selected', 'true')
    expect(dots[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('voting from the action row calls onVerdict and then closes', () => {
    vi.useFakeTimers()
    const onVerdict = vi.fn()
    const onClose = vi.fn()
    render(
      <DetailModal
        activity={fixture}
        onClose={onClose}
        onVerdict={onVerdict}
        superRemaining={5}
      />,
    )
    fireEvent.click(screen.getByLabelText('like'))
    expect(onVerdict).toHaveBeenCalledWith('oui')
    vi.advanceTimersByTime(500)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('renders the trajet block with Tamarin (curated) and Trou aux Biches (computed)', () => {
    render(
      <DetailModal
        activity={{
          ...fixture,
          id: 'a001',
          coords: { lat: -20.044, lng: 57.537 },
          transit: '~1h',
        }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const block = screen.getByLabelText('Trajets depuis les villas')
    expect(block).toBeInTheDocument()
    expect(block).toHaveTextContent('Tamarin')
    expect(block).toHaveTextContent('~1h')
    expect(block).toHaveTextContent('Trou aux Biches')
    expect(block).toHaveTextContent(/~\d/)
  })

  it('omits the Trou aux Biches line when no coords exist', () => {
    render(
      <DetailModal
        activity={{
          ...fixture,
          id: 'unknown-id-no-coords',
          transit: '~1h',
        }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const block = screen.getByLabelText('Trajets depuis les villas')
    expect(block).toHaveTextContent('Tamarin')
    expect(block).not.toHaveTextContent('Trou aux Biches')
  })

  it('renders a "Journée" meta chip when the activity is a full-day destination', () => {
    render(
      <DetailModal
        activity={{ ...fixture, journee: true }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.getByText('Journée')).toBeInTheDocument()
  })

  it('prefers the curated review summary when one exists for the activity', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const block = screen.getByLabelText('Justification de la note')
    expect(block).toHaveTextContent('5.0/5')
    // a001 has a curated summary about Blue Bay coraux/bateaux.
    expect(block).toHaveTextContent(/coraux|bateau/i)
  })

  it('falls back to the generic rating comment for activities without a curated summary', () => {
    render(
      <DetailModal
        activity={{ ...fixture, id: 'a999-unknown' }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const block = screen.getByLabelText('Justification de la note')
    expect(block).toHaveTextContent(/temps forts/i)
  })

  it('renders a "Liens" section listing curated activity links', () => {
    render(
      <DetailModal
        activity={{ ...fixture, id: 'a042' }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const list = screen.getByLabelText('Liens utiles')
    const links = list.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://example.com')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
    expect(links[0]).toHaveTextContent('Site officiel')
    expect(links[1]).toHaveTextContent('example.com/booking')
  })

  it('omits the "Liens" section when the activity has none', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.queryByLabelText('Liens utiles')).not.toBeInTheDocument()
  })

  it('opens a tag legend panel when a tag chip is tapped', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.queryByLabelText('Légende des tags')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Mer & sports nautiques'))
    const panel = screen.getByLabelText('Légende des tags')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Mer & sports nautiques')
    expect(panel).toHaveTextContent('Faune sauvage')
  })

  it('closes the legend panel when a chip is tapped again', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    const chip = screen.getByLabelText('Mer & sports nautiques')
    fireEvent.click(chip)
    expect(screen.getByLabelText('Légende des tags')).toBeInTheDocument()
    fireEvent.click(chip)
    expect(screen.queryByLabelText('Légende des tags')).not.toBeInTheDocument()
  })

  it('renders the "Sur la carte" section heading', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.getByText('Sur la carte')).toBeInTheDocument()
  })

  it('shows the difficulty warning banner for "Difficile" activities', () => {
    render(
      <DetailModal
        activity={{
          ...fixture,
          difficulty: {
            dot: '#FF8A00',
            label: 'Difficile',
            detail: 'rappels, sauts, bonne condition physique requise',
          },
        }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(
      screen.getByLabelText(/Avertissement difficulté: Difficile/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Rappels, sauts, bonne condition physique requise/),
    ).toBeInTheDocument()
  })

  it('shows the warning banner for "Très difficile" without a detail, with a fallback message', () => {
    render(
      <DetailModal
        activity={{
          ...fixture,
          difficulty: { dot: '#FF4757', label: 'Très difficile' },
        }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(
      screen.getByLabelText(/Avertissement difficulté: Très difficile/),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Bonne condition physique requise.'),
    ).toBeInTheDocument()
  })

  it('does NOT show the warning banner for Facile or Modérée activities', () => {
    const { rerender } = render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(
      screen.queryByLabelText(/Avertissement difficulté/),
    ).not.toBeInTheDocument()

    rerender(
      <DetailModal
        activity={{
          ...fixture,
          difficulty: { dot: '#FFB627', label: 'Modérée' },
        }}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(
      screen.queryByLabelText(/Avertissement difficulté/),
    ).not.toBeInTheDocument()
  })

  it('shows the locked placeholder in "Le groupe" when meDone is false', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
      />,
    )
    expect(screen.queryByTestId('group-votes')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Les votes du groupe apparaîtront ici une fois/i),
    ).toBeInTheDocument()
  })

  it('reveals the group votes panel when meDone is true', () => {
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
        meDone
        userId="yves"
        myVerdict="oui"
      />,
    )
    const panel = screen.getByTestId('group-votes')
    expect(panel).toBeInTheDocument()
    expect(panel.querySelectorAll('li')).toHaveLength(9)
    // Yves' row carries the "toi" badge and his real verdict (LIKE).
    const yvesRow = screen.getByTestId('group-vote-yves')
    expect(yvesRow).toHaveTextContent('toi')
    expect(yvesRow).toHaveTextContent('LIKE')
  })

  it('calls onOpenMap with single mode when the mini-map is tapped', async () => {
    const onOpenMap = vi.fn()
    render(
      <DetailModal
        activity={fixture}
        onClose={() => {}}
        onVerdict={() => {}}
        superRemaining={5}
        onOpenMap={onOpenMap}
      />,
    )
    const target = await screen.findByTestId(
      'mini-map-tap-target',
      {},
      { timeout: 3000 },
    )
    fireEvent.click(target)
    expect(onOpenMap).toHaveBeenCalledWith({
      mode: 'single',
      activityId: fixture.id,
    })
  })
})
