import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewPrompt } from './ReviewPrompt.tsx'

describe('ReviewPrompt', () => {
  it('shows the prompt heading', () => {
    render(<ReviewPrompt onConfirm={vi.fn()} />)
    expect(
      screen.getByRole('heading', { name: 'Revoir les votes ?' }),
    ).toBeInTheDocument()
  })

  it('enters review mode when confirmed', () => {
    const onConfirm = vi.fn()
    render(<ReviewPrompt onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'revoir les votes' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
