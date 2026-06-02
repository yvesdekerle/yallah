import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Toast } from './Toast.tsx'

afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('renders the text and the emoji', () => {
    render(<Toast text="Swipe annulé" emoji="↩" onDone={vi.fn()} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('↩')
    expect(status).toHaveTextContent('Swipe annulé')
  })

  it('auto-dismisses via onDone after the duration elapses', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Toast text="x" duration={2400} onDone={onDone} />)
    expect(onDone).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(2400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('never auto-dismisses when duration is 0', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Toast text="x" duration={0} onDone={onDone} />)
    act(() => {
      vi.advanceTimersByTime(100_000)
    })
    expect(onDone).not.toHaveBeenCalled()
  })
})
