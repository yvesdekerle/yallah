import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UndoButton } from './UndoButton.tsx'
import { Toast } from './Toast.tsx'

describe('UndoButton', () => {
  it('is disabled when not enabled', () => {
    render(<UndoButton enabled={false} onClick={() => {}} />)
    expect(screen.getByLabelText('annuler le dernier swipe')).toBeDisabled()
  })

  it('calls onClick when enabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<UndoButton enabled onClick={onClick} />)
    await user.click(screen.getByLabelText('annuler le dernier swipe'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<UndoButton enabled={false} onClick={onClick} />)
    await user.click(screen.getByLabelText('annuler le dernier swipe'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the text and emoji', () => {
    render(<Toast text="Swipe annulé" emoji="↩" onDone={() => {}} />)
    expect(screen.getByText('Swipe annulé')).toBeInTheDocument()
    expect(screen.getByText('↩')).toBeInTheDocument()
  })

  it('calls onDone after the duration elapses', () => {
    const onDone = vi.fn()
    render(<Toast text="x" duration={1000} onDone={onDone} />)
    expect(onDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('does not auto-dismiss when duration is 0', () => {
    const onDone = vi.fn()
    render(<Toast text="x" duration={0} onDone={onDone} />)
    vi.advanceTimersByTime(10_000)
    expect(onDone).not.toHaveBeenCalled()
  })
})
