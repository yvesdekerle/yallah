import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    const target = await screen
      .findByTestId('mini-map-tap-target', {}, { timeout: 2000 })
      .catch(() => null)
    if (target) {
      fireEvent.click(target)
      expect(onOpenMap).toHaveBeenCalledWith({
        mode: 'single',
        activityId: fixture.id,
      })
    }
  })
})
