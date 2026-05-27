import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
        onRequestReset={() => {}}
      />,
    )
    expect(screen.getByText('0 / 5 activités swipées.')).toBeInTheDocument()
    expect(
      screen.getByText(/Va swiper quelques activités/),
    ).toBeInTheDocument()
  })

  it('reports counts per verdict (now including skip)', () => {
    const history: VoteEntry[] = [
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'top' },
      { id: 'a003', verdict: 'non' },
      { id: 'a004', verdict: 'non' },
      { id: 'a005', verdict: 'whynot' },
    ]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onRequestReset={() => {}}
      />,
    )
    expect(screen.getByTestId('results-oui')).toHaveTextContent('1')
    expect(screen.getByTestId('results-top')).toHaveTextContent('1')
    expect(screen.getByTestId('results-whynot')).toHaveTextContent('1')
    expect(screen.getByTestId('results-non')).toHaveTextContent('2')
    expect(screen.getByTestId('results-skip')).toHaveTextContent('0')
  })

  it('lists every voted activity in a single flat list sorted by number', () => {
    const history: VoteEntry[] = [
      { id: 'a003', verdict: 'top' },
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'non' },
    ]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onRequestReset={() => {}}
      />,
    )
    // All voted activities visible, in number order.
    expect(screen.getByText('Activity 1')).toBeInTheDocument()
    expect(screen.getByText('Activity 2')).toBeInTheDocument()
    expect(screen.getByText('Activity 3')).toBeInTheDocument()
    // The DOM order matters — rows should appear by activity number.
    const rows = screen.getAllByTestId(/^vote-row-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'vote-row-a001')
    expect(rows[1]).toHaveAttribute('data-testid', 'vote-row-a002')
    expect(rows[2]).toHaveAttribute('data-testid', 'vote-row-a003')
  })

  it('rows are clickable when onSelectActivity is provided', async () => {
    const user = userEvent.setup()
    const onSelectActivity = vi.fn()
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onRequestReset={() => {}}
        onSelectActivity={onSelectActivity}
      />,
    )
    await user.click(screen.getByTestId('vote-row-a001'))
    expect(onSelectActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a001' }),
    )
  })

  it('reset button is disabled when no votes', () => {
    render(
      <ResultsScreen
        history={[]}
        activities={ACTIVITIES}
        onRequestReset={() => {}}
      />,
    )
    expect(screen.getByLabelText('réinitialiser les votes')).toBeDisabled()
  })

  it('reset button forwards to onRequestReset (modal is rendered at App level)', async () => {
    const user = userEvent.setup()
    const onRequestReset = vi.fn()
    const history: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]
    render(
      <ResultsScreen
        history={history}
        activities={ACTIVITIES}
        onRequestReset={onRequestReset}
      />,
    )
    await user.click(screen.getByLabelText('réinitialiser les votes'))
    expect(onRequestReset).toHaveBeenCalledOnce()
  })

  it('renders the "Voir sur la carte" button when there are LIKE/SUPER_LIKE pins with coords', () => {
    const onOpenMap = vi.fn()
    render(
      <ResultsScreen
        history={[{ id: 'a001', verdict: 'oui' }]}
        activities={[
          {
            id: 'a001',
            number: 1,
            title: 'Test',
            tags: [],
            category: '',
            location: '',
            transit: '',
            description: '',
            price: '',
            rating: 5,
            pepite: false,
            secret: false,
          },
        ]}
        onRequestReset={() => {}}
        onOpenMap={onOpenMap}
      />,
    )
    // a001 has an override in coords-overrides.json so this should be truthy.
    const btn = screen.getByRole('button', { name: /voir sur la carte/i })
    fireEvent.click(btn)
    expect(onOpenMap).toHaveBeenCalledTimes(1)
  })

  it('hides the "Voir sur la carte" button when no LIKE/SUPER_LIKE pins exist', () => {
    render(
      <ResultsScreen
        history={[]}
        activities={[]}
        onRequestReset={() => {}}
        onOpenMap={() => {}}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /voir sur la carte/i }),
    ).toBeNull()
  })
})
