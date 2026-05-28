import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('renders all four tabs', () => {
    render(<BottomNav active={0} onChange={() => {}} />)
    expect(screen.getByLabelText('vote')).toBeInTheDocument()
    expect(screen.getByLabelText('résultats')).toBeInTheDocument()
    expect(screen.getByLabelText('groupe')).toBeInTheDocument()
    expect(screen.getByLabelText('ajouter')).toBeInTheDocument()
  })

  it('marks the active tab via aria-pressed', () => {
    render(<BottomNav active={1} onChange={() => {}} />)
    expect(screen.getByLabelText('résultats')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('vote')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onChange when a tab is tapped', async () => {
    const onChange = vi.fn()
    render(<BottomNav active={0} onChange={onChange} />)
    await userEvent.setup().click(screen.getByLabelText('résultats'))
    expect(onChange).toHaveBeenCalledWith(1)
  })
})
