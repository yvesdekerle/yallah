import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsScreen } from './ResultsScreen.tsx'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

const make = (n: number): Activity => ({
  id: `a${n.toString().padStart(3, '0')}`,
  number: n,
  title: `Activity ${n}`,
  tags: ['🌊'],
  category: 'Test',
  location: 'L',
  transit: '~10 min',
  description: 'd',
  price: '10 €',
  rating: 5,
  pepite: false,
  secret: false,
})

const ACTIVITIES = [1, 2, 3, 4, 5].map(make)

describe('ResultsScreen', () => {
  it('shows the swipe count and empty-state message when no votes', () => {
    render(
      <ResultsScreen
        history={[]}
        activities={ACTIVITIES}
        onReset={() => {}}
      />,
    )
    expect(screen.getByText('0 / 5 activités swipées.')).toBeInTheDocument()
    expect(
      screen.getByText(/Va swiper quelques activités/),
    ).toBeInTheDocument()
  })

  it('reports counts per verdict', () => {
    const history: VoteEntry[] = [
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'top' },
      { id: 'a003', verdict: 'non' },
      { id: 'a004', verdict: 'non' },
      { id: 'a005', verdict: 'neutre' },
    ]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onReset={() => {}}
      />,
    )
    expect(screen.getByTestId('results-oui')).toHaveTextContent('1')
    expect(screen.getByTestId('results-top')).toHaveTextContent('1')
    expect(screen.getByTestId('results-neutre')).toHaveTextContent('1')
    expect(screen.getByTestId('results-non')).toHaveTextContent('2')
  })

  it('lists super-likes and likes', () => {
    const history: VoteEntry[] = [
      { id: 'a001', verdict: 'top' },
      { id: 'a002', verdict: 'oui' },
    ]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onReset={() => {}}
      />,
    )
    expect(screen.getByText('Tes super-likes')).toBeInTheDocument()
    expect(screen.getByText('Activity 1')).toBeInTheDocument()
    expect(screen.getByText('Tes oui')).toBeInTheDocument()
    expect(screen.getByText('Activity 2')).toBeInTheDocument()
  })

  it('reset button is disabled when no votes', () => {
    render(
      <ResultsScreen
        history={[]}
        activities={ACTIVITIES}
        onReset={() => {}}
      />,
    )
    expect(screen.getByLabelText('réinitialiser les votes')).toBeDisabled()
  })

  it('reset asks for confirmation before firing onReset', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onReset={onReset}
      />,
    )
    await user.click(screen.getByLabelText('réinitialiser les votes'))
    // Modal is open — onReset not called yet.
    expect(screen.getByText('Tout effacer ?')).toBeInTheDocument()
    expect(onReset).not.toHaveBeenCalled()
    // Confirm.
    await user.click(screen.getByText('Tout effacer'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('cancel in the confirm modal closes it without resetting', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onReset={onReset}
      />,
    )
    await user.click(screen.getByLabelText('réinitialiser les votes'))
    await user.click(screen.getByText('Annuler'))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.queryByText('Tout effacer ?')).not.toBeInTheDocument()
  })
})
