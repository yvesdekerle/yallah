import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuperLikeFX } from './SuperLikeFX.tsx'

describe('SuperLikeFX', () => {
  it('renders without crashing and shows the SUPER LIKE caption', () => {
    render(<SuperLikeFX />)
    expect(screen.getByText('SUPER')).toBeInTheDocument()
    expect(screen.getByText('LIKE')).toBeInTheDocument()
  })

  it('renders multiple SVG sparkles', () => {
    const { container } = render(<SuperLikeFX />)
    // 14 sparkles + 1 star = at least 15 svg children inside the FX root.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(15)
  })
})
