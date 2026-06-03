import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { SwipeDeck, type SwipeDeckHandle } from './SwipeDeck.tsx'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

const a = (n: number): Activity => ({
  id: `a${n.toString().padStart(3, '0')}`,
  number: n,
  title: `Activity ${n}`,
  tags: ['🌊'],
  category: 'Test',
  location: `Loc ${n}`,
  transit: '~10 min',
  description: `Description ${n}`,
  price: '10 €',
  rating: 5,
  pepite: false,
  secret: false,
})

const ACTIVITIES = Array.from({ length: 4 }, (_, i) => a(i + 1))

describe('SwipeDeck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the first activity as the active card', () => {
    render(
      <SwipeDeck
        activities={ACTIVITIES}
        history={[]}
        superRemaining={5}
        onVerdict={() => {}}
      />,
    )
    expect(screen.getByText('Activity 1')).toBeInTheDocument()
  })

  it('commits a verdict via the imperative handle and advances the stack', () => {
    const ref = createRef<SwipeDeckHandle>()
    const onVerdict = vi.fn()
    render(
      <SwipeDeck
        ref={ref}
        activities={ACTIVITIES}
        history={[]}
        superRemaining={5}
        onVerdict={onVerdict}
      />,
    )
    act(() => {
      ref.current?.commit('oui')
    })
    expect(onVerdict).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a001' }),
      'oui',
      undefined,
    )
    // After the exit duration the second card becomes active.
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(screen.getAllByText(/Activity 2/).length).toBeGreaterThan(0)
  })

  it('converts a super-like to "oui" when quota is exhausted, with quotaHit meta', () => {
    const ref = createRef<SwipeDeckHandle>()
    const onVerdict = vi.fn()
    render(
      <SwipeDeck
        ref={ref}
        activities={ACTIVITIES}
        history={[]}
        superRemaining={0}
        onVerdict={onVerdict}
      />,
    )
    act(() => {
      ref.current?.commit('top')
    })
    expect(onVerdict).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a001' }),
      'oui',
      { quotaHit: true },
    )
  })

  it('aligns its visible top index with history.length when the parent undoes', () => {
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    const { rerender } = render(
      <SwipeDeck
        activities={ACTIVITIES}
        history={history}
        superRemaining={5}
        onVerdict={() => {}}
      />,
    )
    expect(screen.getAllByText(/Activity 2/).length).toBeGreaterThan(0)

    rerender(
      <SwipeDeck
        activities={ACTIVITIES}
        history={[]}
        superRemaining={5}
        onVerdict={() => {}}
      />,
    )
    expect(screen.getAllByText(/Activity 1/).length).toBeGreaterThan(0)
  })

  it('fires onComplete once the deck is exhausted', () => {
    const onComplete = vi.fn()
    const ref = createRef<SwipeDeckHandle>()
    const onlyOne = ACTIVITIES.slice(0, 1)
    render(
      <SwipeDeck
        ref={ref}
        activities={onlyOne}
        history={[]}
        superRemaining={5}
        onVerdict={() => {}}
        onComplete={onComplete}
      />,
    )
    act(() => {
      ref.current?.commit('non')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('reports the user-intended verdict (not the converted "oui") in onVerdict for quota hits', () => {
    const ref = createRef<SwipeDeckHandle>()
    const onVerdict = vi.fn()
    render(
      <SwipeDeck
        ref={ref}
        activities={ACTIVITIES}
        history={[]}
        superRemaining={2}
        onVerdict={onVerdict}
      />,
    )
    act(() => {
      ref.current?.commit('top')
    })
    expect(onVerdict).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'a001' }),
      'top',
      undefined,
    )
  })

  // --- Pointer-gesture branches ---------------------------------------------

  const activeCard = () => screen.getByTestId('active-card')
  // Press, move by (dx, dy) from a fixed origin, release at the moved point.
  const drag = (dx: number, dy: number) => {
    const card = activeCard()
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(card, { clientX: 100 + dx, clientY: 100 + dy })
    fireEvent.pointerUp(card, { clientX: 100 + dx, clientY: 100 + dy })
  }
  const renderDeck = (props: Partial<Parameters<typeof SwipeDeck>[0]> = {}) => {
    const onVerdict = vi.fn()
    const onOpenDetail = vi.fn()
    render(
      <SwipeDeck
        activities={ACTIVITIES}
        history={[]}
        superRemaining={5}
        onVerdict={onVerdict}
        onOpenDetail={onOpenDetail}
        {...props}
      />,
    )
    return { onVerdict, onOpenDetail }
  }

  it.each([
    ['rightward', 120, 0, 'oui'],
    ['leftward', -120, 0, 'non'],
    ['upward', 0, -120, 'top'],
    ['downward', 0, 120, 'whynot'],
  ] as const)(
    'commits "%s → %s" when dragged past the threshold',
    (_dir, dx, dy, expected) => {
      const { onVerdict } = renderDeck()
      drag(dx, dy)
      expect(onVerdict).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a001' }),
        expected,
        undefined,
      )
      // Let the exit animation (whichever duration) settle the next card in.
      act(() => {
        vi.advanceTimersByTime(900)
      })
      expect(screen.getAllByText(/Activity 2/).length).toBeGreaterThan(0)
    },
  )

  it('opens the detail on a tap (fast, <8px) instead of committing', () => {
    const { onVerdict, onOpenDetail } = renderDeck()
    const card = activeCard()
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(card, { clientX: 102, clientY: 101 })
    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a001' }),
    )
    expect(onVerdict).not.toHaveBeenCalled()
  })

  it('neither votes nor opens detail when released between the tap and swipe thresholds', () => {
    const { onVerdict, onOpenDetail } = renderDeck()
    // Moved 20px: too far for a tap (>8px), too short for a verdict (<36px).
    drag(20, 0)
    expect(onVerdict).not.toHaveBeenCalled()
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  // --- Review-mode branches -------------------------------------------------

  it('restarts from the top and surfaces the previous-vote banner in review mode', () => {
    const onVerdict = vi.fn()
    render(
      <SwipeDeck
        activities={ACTIVITIES}
        history={[{ id: 'a001', verdict: 'whynot' }]}
        superRemaining={5}
        onVerdict={onVerdict}
        reviewMode
      />,
    )
    // topIdx reset to 0 → Activity 1 is active again despite the vote on it.
    expect(screen.getAllByText(/Activity 1/).length).toBeGreaterThan(0)
    const banner = screen.getByRole('region', { name: /Tu as voté/ })
    expect(banner).toBeInTheDocument()
    // Pointer events on the pill are swallowed (stopPropagation) so interacting
    // with it never starts a card drag or commits a verdict.
    fireEvent.pointerDown(banner, { clientX: 100, clientY: 60, pointerId: 1 })
    fireEvent.pointerMove(banner, { clientX: 220, clientY: 60 })
    fireEvent.pointerUp(banner, { clientX: 220, clientY: 60 })
    expect(onVerdict).not.toHaveBeenCalled()
    // The "=" button keeps the same verdict.
    act(() => {
      fireEvent.click(screen.getByLabelText('Garder la même réponse'))
    })
    expect(onVerdict).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a001' }),
      'whynot',
      undefined,
    )
  })

  it('snaps the deck back to the top when review mode is switched on', () => {
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    const { rerender } = render(
      <SwipeDeck
        activities={ACTIVITIES}
        history={history}
        superRemaining={5}
        onVerdict={() => {}}
      />,
    )
    // Normal mode: topIdx = history.length = 1 → Activity 2 active.
    expect(screen.getAllByText(/Activity 2/).length).toBeGreaterThan(0)
    rerender(
      <SwipeDeck
        activities={ACTIVITIES}
        history={history}
        superRemaining={5}
        onVerdict={() => {}}
        reviewMode
      />,
    )
    // Review mode flips on → topIdx snaps to 0 → Activity 1 active.
    expect(screen.getAllByText(/Activity 1/).length).toBeGreaterThan(0)
  })
})
