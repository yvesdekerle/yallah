import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SwipeScreen } from './SwipeScreen.tsx'
import type { SwipeDeckHandle } from './SwipeDeck.tsx'
import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

const activity: Activity = {
  id: 'a001',
  number: 1,
  title: 'Snorkeling à Blue Bay',
  tags: ['🌊'],
  category: '🌊 Mer',
  location: 'Blue Bay',
  transit: '~1h',
  description: 'Parc marin protégé.',
  price: '~25 €',
  rating: 5,
  pepite: false,
  secret: false,
}

const voted: VoteEntry[] = [{ id: 'a001', verdict: 'oui' }]

function renderScreen(
  overrides: Partial<Parameters<typeof SwipeScreen>[0]> = {},
) {
  const props = {
    deckRef: createRef<SwipeDeckHandle>(),
    deckActivities: [activity],
    history: [] as VoteEntry[],
    superRemaining: 5,
    reviewMode: false,
    done: false,
    filteredEmpty: false,
    activeFilterCount: 0,
    detailOpen: false,
    onVerdict: vi.fn(),
    onUndo: vi.fn(),
    onExitReview: vi.fn(),
    onAction: vi.fn(),
    onReview: vi.fn(),
    onComplete: vi.fn(),
    onOpenFilter: vi.fn(),
    onOpenDetail: vi.fn(),
    onToggleDetail: vi.fn(),
    ...overrides,
  }
  render(<SwipeScreen {...props} />)
  return props
}

describe('SwipeScreen', () => {
  it('shows the action row while swiping and hides the review prompt', () => {
    renderScreen()
    expect(screen.getByLabelText('like')).toBeInTheDocument()
    expect(screen.queryByTestId('review-prompt')).toBeNull()
  })

  it('swaps the action row for the review prompt once the deck is done', () => {
    renderScreen({ done: true })
    expect(screen.getByTestId('review-prompt')).toBeInTheDocument()
    expect(screen.queryByLabelText('like')).toBeNull()
  })

  it('forwards action-row verdicts to onAction', () => {
    const props = renderScreen()
    fireEvent.click(screen.getByLabelText('like'))
    fireEvent.click(screen.getByLabelText('non'))
    expect(props.onAction).toHaveBeenNthCalledWith(1, 'oui')
    expect(props.onAction).toHaveBeenNthCalledWith(2, 'non')
  })

  it('forwards the eye toggle to onToggleDetail', () => {
    const props = renderScreen()
    fireEvent.click(screen.getByLabelText('voir le détail'))
    expect(props.onToggleDetail).toHaveBeenCalledTimes(1)
  })

  it('renders the review-mode exit pill only in review mode and reports clicks', () => {
    const props = renderScreen({ reviewMode: true })
    const pill = screen.getByLabelText('quitter le mode révision')
    fireEvent.click(pill)
    expect(props.onExitReview).toHaveBeenCalledTimes(1)
  })

  it('omits the exit pill outside review mode', () => {
    renderScreen()
    expect(
      screen.queryByLabelText('quitter le mode révision'),
    ).toBeNull()
  })

  it('shows the empty-filter fallback and routes its button to onOpenFilter', () => {
    const props = renderScreen({ filteredEmpty: true })
    expect(
      screen.getByText('Aucune activité à voter pour ces catégories.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('Modifier les filtres'))
    expect(props.onOpenFilter).toHaveBeenCalledTimes(1)
  })

  it('enables undo with history (and reports clicks), disables it when empty', () => {
    const props = renderScreen({ history: voted })
    const undo = screen.getByLabelText('annuler le dernier swipe')
    expect(undo).toBeEnabled()
    fireEvent.click(undo)
    expect(props.onUndo).toHaveBeenCalledTimes(1)
  })

  it('disables undo when there is no history', () => {
    renderScreen()
    expect(screen.getByLabelText('annuler le dernier swipe')).toBeDisabled()
  })
})
