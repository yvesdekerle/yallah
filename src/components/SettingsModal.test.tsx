import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsModal } from './SettingsModal.tsx'

describe('SettingsModal', () => {
  it('shows the app version', () => {
    render(<SettingsModal version="1.2.3" onClose={() => {}} />)
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument()
  })

  it('closes via the close button', () => {
    const onClose = vi.fn()
    render(<SettingsModal version="1.0.0" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('fermer les réglages'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
