import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from './WelcomeScreen.tsx'

describe('WelcomeScreen', () => {
  it('renders the wordmark, the google slot and the demo button', () => {
    render(
      <WelcomeScreen
        googleSlot={<button>slot-google</button>}
        onDemo={() => {}}
      />,
    )
    expect(screen.getByText('yallah')).toBeInTheDocument()
    expect(screen.getByText('slot-google')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mode démo' })).toBeInTheDocument()
  })

  it('calls onDemo when the demo button is clicked', () => {
    const onDemo = vi.fn()
    render(<WelcomeScreen googleSlot={null} onDemo={onDemo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mode démo' }))
    expect(onDemo).toHaveBeenCalledTimes(1)
  })
})
