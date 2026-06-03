import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoogleButton } from './GoogleButton.tsx'

describe('GoogleButton', () => {
  it('shows the sign-in label and fires onClick', () => {
    const onClick = vi.fn()
    render(<GoogleButton onClick={onClick} />)
    const btn = screen.getByRole('button', { name: /Se connecter avec Google/ })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows the unavailable label and is disabled when disabled', () => {
    const onClick = vi.fn()
    render(<GoogleButton onClick={onClick} disabled />)
    const btn = screen.getByRole('button', {
      name: /Connexion Google indisponible/,
    })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })
})
