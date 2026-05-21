import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, screen, act } from '@testing-library/react'
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
})
