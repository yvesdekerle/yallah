import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TigerPop } from './TigerPop.tsx'

describe('TigerPop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the tiger and the "Tié un tigre !" line', () => {
    render(<TigerPop onDone={() => {}} />)
    expect(screen.getByText('Tié un tigre !')).toBeInTheDocument()
    expect(screen.getByLabelText('Tié un tigre !')).toBeInTheDocument()
  })

  it('auto-dismisses after the duration', () => {
    const onDone = vi.fn()
    render(<TigerPop duration={2600} onDone={onDone} />)
    expect(onDone).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('dismisses on tap', () => {
    const onDone = vi.fn()
    render(<TigerPop onDone={onDone} />)
    fireEvent.click(screen.getByLabelText('Tié un tigre !'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
