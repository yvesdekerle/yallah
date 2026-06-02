import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

  it('reports counts per verdict', () => {
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
    // Each stat tile pairs a visible label with its count — locate the tile
    // by the label the user reads, then assert the count shown inside it.
    const tile = (label: string) =>
      within(screen.getByText(label).parentElement as HTMLElement)
    expect(tile('♥ like').getByText('1')).toBeInTheDocument()
    expect(tile('★ super like').getByText('1')).toBeInTheDocument()
    expect(tile('↓ why not').getByText('1')).toBeInTheDocument()
    expect(tile('✕ non').getByText('2')).toBeInTheDocument()
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
    // All voted activities visible, in activity-number order. getAllByText
    // returns matches in DOM order, so the visible titles double as the
    // ordering assertion — no positional data-testid needed.
    const titles = screen
      .getAllByText(/^Activity \d+$/)
      .map((el) => el.textContent)
    expect(titles).toEqual(['Activity 1', 'Activity 2', 'Activity 3'])
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
    // Clickable rows expose an accessible name, so target the row the way a
    // screen-reader user would instead of by data-testid.
    await user.click(
      screen.getByRole('button', { name: 'Voir le détail de Activity 1' }),
    )
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
