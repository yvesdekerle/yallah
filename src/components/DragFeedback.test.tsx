import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen, act } from '@testing-library/react'
import { DragFeedback, type DragFeedbackHandle } from './DragFeedback.tsx'

describe('DragFeedback', () => {
  const setup = () => {
    const ref = createRef<DragFeedbackHandle>()
    const utils = render(<DragFeedback ref={ref} />)
    return { ref, ...utils }
  }

  it('renders nothing until a drag offset is pushed', () => {
    const { container } = setup()
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the heart stamp for a rightward drag (oui)', () => {
    const { ref } = setup()
    act(() => ref.current?.update(120, 0))
    expect(screen.getByText('LIKE')).toBeInTheDocument()
  })

  it('shows the NON stamp for a leftward drag, then clears it on release', () => {
    const { ref } = setup()
    act(() => ref.current?.update(-120, 0))
    expect(screen.getByText('NON')).toBeInTheDocument()
    act(() => ref.current?.clear())
    expect(screen.queryByText('NON')).not.toBeInTheDocument()
  })

  it('shows the WHY NOT stamp for a downward drag', () => {
    const { ref } = setup()
    act(() => ref.current?.update(0, 120))
    expect(screen.getByText('WHY NOT')).toBeInTheDocument()
  })

  it('shows the tint but no rubber stamp for an upward (super-like) drag', () => {
    const { ref, container } = setup()
    act(() => ref.current?.update(0, -120))
    // `top` has its own exit FX, not an inline stamp — only the tint renders.
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByText('LIKE')).not.toBeInTheDocument()
    expect(screen.queryByText('NON')).not.toBeInTheDocument()
  })

  it('renders nothing below the verdict threshold', () => {
    const { ref, container } = setup()
    act(() => ref.current?.update(10, 0)) // under SWIPE_H * 0.4 → no verdict
    expect(container).toBeEmptyDOMElement()
  })
})
