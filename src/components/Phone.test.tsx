import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Phone } from './Phone.tsx'
import { TopBar } from './TopBar.tsx'
import { BottomNav } from './BottomNav.tsx'

describe('Phone', () => {
  it('renders children inside the screen', () => {
    render(
      <Phone>
        <div data-testid="content">hello</div>
      </Phone>,
    )
    expect(screen.getByTestId('content')).toHaveTextContent('hello')
  })
})

describe('TopBar', () => {
  it('renders the yallah wordmark', () => {
    render(<TopBar />)
    expect(screen.getByText('yallah')).toBeInTheDocument()
  })
})

describe('BottomNav', () => {
  it('renders all three tabs', () => {
    render(<BottomNav />)
    expect(screen.getByLabelText('swipe')).toBeInTheDocument()
    expect(screen.getByLabelText('résultats')).toBeInTheDocument()
    expect(screen.getByLabelText('groupe')).toBeInTheDocument()
  })

  it('marks the active tab via aria-pressed', () => {
    render(<BottomNav active={1} />)
    expect(screen.getByLabelText('résultats')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('swipe')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
