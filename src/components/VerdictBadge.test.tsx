import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerdictBadge } from './VerdictBadge.tsx'
import { VERDICT_META } from '../constants/swipe.ts'

describe('VerdictBadge', () => {
  it('renders the activity number zero-padded to two digits', () => {
    render(<VerdictBadge verdict="oui" number={5} />)
    expect(screen.getByText('05')).toBeInTheDocument()
  })

  it('uses a heart glyph in the verdict colour for "oui"', () => {
    const { container } = render(<VerdictBadge verdict="oui" number={1} />)
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path).toHaveAttribute('fill', VERDICT_META.oui.color)
    expect(container.querySelector('circle')).toBeNull()
  })

  it('uses a star glyph in the verdict colour for "top"', () => {
    const { container } = render(<VerdictBadge verdict="top" number={1} />)
    expect(container.querySelector('path')).toHaveAttribute(
      'fill',
      VERDICT_META.top.color,
    )
  })

  it('uses a coloured circle for "non" and "whynot"', () => {
    const non = render(<VerdictBadge verdict="non" number={1} />)
    expect(non.container.querySelector('circle')).toHaveAttribute(
      'fill',
      VERDICT_META.non.color,
    )
    expect(non.container.querySelector('path')).toBeNull()

    const whynot = render(<VerdictBadge verdict="whynot" number={1} />)
    expect(whynot.container.querySelector('circle')).toHaveAttribute(
      'fill',
      VERDICT_META.whynot.color,
    )
  })
})
