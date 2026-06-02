import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Splash } from './Splash.tsx'

describe('Splash', () => {
  it('shows the loading state by default', () => {
    render(<Splash />)
    expect(screen.getByText('yallah')).toBeInTheDocument()
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows an error message and a working retry button in error mode', () => {
    const onRetry = vi.fn()
    render(<Splash error onRetry={onRetry} />)
    expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
