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
  it('renders all five buttons', () => {
    setup()
    expect(screen.getByLabelText('non')).toBeInTheDocument()
    expect(screen.getByLabelText('why not')).toBeInTheDocument()
    expect(screen.getByLabelText('oui')).toBeInTheDocument()
    expect(screen.getByLabelText('super like')).toBeInTheDocument()
    expect(screen.getByLabelText('voir le détail')).toBeInTheDocument()
  })

  it('calls onAct with the correct verdict for each verdict button', async () => {
    const user = userEvent.setup()
    const { onAct } = setup()
    await user.click(screen.getByLabelText('non'))
    await user.click(screen.getByLabelText('why not'))
    await user.click(screen.getByLabelText('oui'))
    await user.click(screen.getByLabelText('super like'))
    expect(onAct).toHaveBeenNthCalledWith(1, 'non')
    expect(onAct).toHaveBeenNthCalledWith(2, 'neutre')
    expect(onAct).toHaveBeenNthCalledWith(3, 'oui')
    expect(onAct).toHaveBeenNthCalledWith(4, 'top')
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
})
