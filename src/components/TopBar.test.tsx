import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from './TopBar.tsx'

describe('TopBar — hidden settings gesture', () => {
  it('opens settings after 5 consecutive taps on the wordmark', () => {
    const onSecretOpen = vi.fn()
    render(<TopBar onSecretOpen={onSecretOpen} />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 5; i++) fireEvent.click(mark)
    expect(onSecretOpen).toHaveBeenCalledTimes(1)
  })

  it('does not open before the 5th tap', () => {
    const onSecretOpen = vi.fn()
    render(<TopBar onSecretOpen={onSecretOpen} />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 4; i++) fireEvent.click(mark)
    expect(onSecretOpen).not.toHaveBeenCalled()
  })

  it('is inert when no handler is provided', () => {
    render(<TopBar />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 5; i++) fireEvent.click(mark)
    // No throw, nothing to assert beyond surviving the taps.
    expect(mark).toBeInTheDocument()
  })
})
