import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagLegend } from './TagLegend.tsx'

const WAVE = 'Mer & sports nautiques' // labelForTag('🌊')

describe('TagLegend', () => {
  it('toggles via the chip and lists the labels when open', () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <TagLegend tags={['🌊', '💎']} open={false} onToggle={onToggle} />,
    )
    expect(screen.getByRole('button', { name: WAVE })).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: 'Légende des tags' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: WAVE }))
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerender(<TagLegend tags={['🌊', '💎']} open onToggle={onToggle} />)
    const dialog = screen.getByRole('dialog', { name: 'Légende des tags' })
    expect(dialog).toHaveTextContent(WAVE)
    expect(dialog).toHaveTextContent('Pépite — coup de cœur')
  })

  it('swallows pointer events on the chip when asked (so a card drag never starts)', () => {
    const down = vi.fn()
    const move = vi.fn()
    const up = vi.fn()
    render(
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up}>
        <TagLegend
          tags={['🌊']}
          open={false}
          onToggle={() => {}}
          swallowPointerEvents
        />
      </div>,
    )
    const chip = screen.getByRole('button', { name: WAVE })
    fireEvent.pointerDown(chip)
    fireEvent.pointerMove(chip)
    fireEvent.pointerUp(chip)
    expect(down).not.toHaveBeenCalled()
    expect(move).not.toHaveBeenCalled()
    expect(up).not.toHaveBeenCalled()
  })

  it('lets pointer events bubble when the flag is off', () => {
    const down = vi.fn()
    render(
      <div onPointerDown={down}>
        <TagLegend tags={['🌊']} open={false} onToggle={() => {}} />
      </div>,
    )
    fireEvent.pointerDown(screen.getByRole('button', { name: WAVE }))
    expect(down).toHaveBeenCalledTimes(1)
  })
})
