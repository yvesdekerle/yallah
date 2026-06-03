import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wordmark } from './Wordmark.tsx'

describe('Wordmark', () => {
  it('renders the yallah text', () => {
    render(<Wordmark />)
    expect(screen.getByText('yallah')).toBeInTheDocument()
  })

  it('scales with the size prop', () => {
    render(<Wordmark size={44} />)
    const text = screen.getByText('yallah').parentElement as HTMLElement
    expect(text.style.fontSize).toBe('44px')
  })
})
