import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionRow } from './ActionRow.tsx'

function setup(overrides: Partial<Parameters<typeof ActionRow>[0]> = {}) {
  const onAct = vi.fn()
  const onToggleDetail = vi.fn()
  render(
    <ActionRow
      onAct={onAct}
      superRemaining={5}
      onToggleDetail={onToggleDetail}
      detailOpen={false}
      {...overrides}
    />,
  )
  return { onAct, onToggleDetail }
}

describe('ActionRow', () => {
  it('renders the five buttons', () => {
    setup()
    expect(screen.getByLabelText('non')).toBeInTheDocument()
    expect(screen.getByLabelText('why not')).toBeInTheDocument()
    expect(screen.getByLabelText('super like')).toBeInTheDocument()
    expect(screen.getByLabelText('like')).toBeInTheDocument()
    expect(screen.getByLabelText('voir le détail')).toBeInTheDocument()
  })

  it('calls onAct with the correct verdict for each verdict button', async () => {
    const user = userEvent.setup()
    const { onAct } = setup()
    await user.click(screen.getByLabelText('non'))
    await user.click(screen.getByLabelText('why not'))
    await user.click(screen.getByLabelText('super like'))
    await user.click(screen.getByLabelText('like'))
    expect(onAct).toHaveBeenNthCalledWith(1, 'non')
    expect(onAct).toHaveBeenNthCalledWith(2, 'whynot')
    expect(onAct).toHaveBeenNthCalledWith(3, 'top')
    expect(onAct).toHaveBeenNthCalledWith(4, 'oui')
  })

  it('shows the super-like quota as a badge', () => {
    setup({ superRemaining: 3 })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('disables and ignores super-like clicks when quota is exhausted', async () => {
    const user = userEvent.setup()
    const { onAct } = setup({ superRemaining: 0 })
    const btn = screen.getByLabelText('super like')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onAct).not.toHaveBeenCalled()
  })

  it('toggles the detail and switches the eye icon label', async () => {
    const user = userEvent.setup()
    const { onToggleDetail } = setup({ detailOpen: true })
    expect(screen.getByLabelText('fermer le détail')).toBeInTheDocument()
    await user.click(screen.getByLabelText('fermer le détail'))
    expect(onToggleDetail).toHaveBeenCalledTimes(1)
  })

  it('omits the filter button when onOpenFilter is not provided', () => {
    setup()
    expect(
      screen.queryByLabelText('filtrer par catégorie'),
    ).not.toBeInTheDocument()
  })

  it('renders the filter button and forwards clicks', async () => {
    const user = userEvent.setup()
    const onOpenFilter = vi.fn()
    setup({ onOpenFilter })
    await user.click(screen.getByLabelText('filtrer par catégorie'))
    expect(onOpenFilter).toHaveBeenCalledTimes(1)
  })

  it('shows the active filter count as a badge', () => {
    setup({ onOpenFilter: vi.fn(), activeFilterCount: 3 })
    expect(screen.getByTestId('filter-badge')).toHaveTextContent('3')
  })

  it('hides the filter badge when no filter is active', () => {
    setup({ onOpenFilter: vi.fn(), activeFilterCount: 0 })
    expect(screen.queryByTestId('filter-badge')).not.toBeInTheDocument()
  })
})
