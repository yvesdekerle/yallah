import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StampOverlay } from './StampOverlay.tsx'
import { HeartStamp } from './HeartStamp.tsx'

describe('StampOverlay', () => {
  it('renders the NON label', () => {
    render(<StampOverlay verdict="non" intensity={1} />)
    expect(screen.getByText('NON')).toBeInTheDocument()
  })

  it('renders WHY NOT for the whynot verdict', () => {
    render(<StampOverlay verdict="whynot" intensity={0.5} />)
    expect(screen.getByText('WHY NOT')).toBeInTheDocument()
  })

  it('has near-zero opacity at intensity 0', () => {
    const { container } = render(<StampOverlay verdict="non" intensity={0} />)
    const el = container.firstChild as HTMLElement
    expect(parseFloat(el.style.opacity)).toBeLessThan(0.2)
  })

  it('reaches full opacity at intensity 1', () => {
    const { container } = render(<StampOverlay verdict="non" intensity={1} />)
    const el = container.firstChild as HTMLElement
    expect(parseFloat(el.style.opacity)).toBe(1)
  })
})

describe('HeartStamp', () => {
  it('renders the OUI text', () => {
    render(<HeartStamp intensity={1} />)
    expect(screen.getByText('LIKE')).toBeInTheDocument()
  })

  it('renders an SVG heart', () => {
    const { container } = render(<HeartStamp intensity={1} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
