import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagFilterSheet } from './TagFilterSheet.tsx'

const TAGS = ['🌊', '🏛️', '🌳']
const COUNTS = { '🌊': 52, '🏛️': 81, '🌳': 60 }

function setup(overrides: Partial<Parameters<typeof TagFilterSheet>[0]> = {}) {
  const onApply = vi.fn()
  const onClose = vi.fn()
  render(
    <TagFilterSheet
      tags={TAGS}
      tagCounts={COUNTS}
      selected={[]}
      onApply={onApply}
      onClose={onClose}
      {...overrides}
    />,
  )
  return { onApply, onClose }
}

describe('TagFilterSheet', () => {
  it('renders a chip per tag with its human label and count', () => {
    setup()
    expect(screen.getByText('Mer & sports nautiques')).toBeInTheDocument()
    expect(screen.getByText('Patrimoine & culture')).toBeInTheDocument()
    expect(screen.getByText('Nature & extérieur')).toBeInTheDocument()
    expect(screen.getByText('52')).toBeInTheDocument()
  })

  it('initialises the draft from the applied selection', () => {
    setup({ selected: ['🌊'] })
    expect(screen.getByTestId('filter-chip-🌊')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('filter-chip-🏛️')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('toggles a chip on/off across taps', async () => {
    const user = userEvent.setup()
    setup()
    const chip = screen.getByTestId('filter-chip-🌊')
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies the draft selection on Confirmer', async () => {
    const user = userEvent.setup()
    const { onApply, onClose } = setup()
    await user.click(screen.getByTestId('filter-chip-🌊'))
    await user.click(screen.getByTestId('filter-chip-🌳'))
    await user.click(screen.getByTestId('filter-confirm'))
    expect(onApply).toHaveBeenCalledWith(['🌊', '🌳'])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('selects every tag with "Tout sélectionner"', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()
    await user.click(screen.getByText('Tout sélectionner'))
    await user.click(screen.getByTestId('filter-confirm'))
    expect(onApply).toHaveBeenCalledWith(TAGS)
  })

  it('clears the selection with "Tout désélectionner"', async () => {
    const user = userEvent.setup()
    const { onApply } = setup({ selected: ['🌊', '🏛️'] })
    await user.click(screen.getByText('Tout désélectionner'))
    await user.click(screen.getByTestId('filter-confirm'))
    expect(onApply).toHaveBeenCalledWith([])
  })

  it('dismisses via the backdrop without applying', async () => {
    const user = userEvent.setup()
    const { onApply, onClose } = setup()
    await user.click(screen.getByTestId('filter-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})
