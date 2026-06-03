import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsModal } from './SettingsModal.tsx'

const noop = () => {}

describe('SettingsModal', () => {
  it('shows the app version', () => {
    render(<SettingsModal version="1.2.3" onClose={noop} onGoHome={noop} />)
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument()
  })

  it('closes via the close button', () => {
    const onClose = vi.fn()
    render(<SettingsModal version="1.0.0" onClose={onClose} onGoHome={noop} />)
    fireEvent.click(screen.getByLabelText('fermer les réglages'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<SettingsModal version="1.0.0" onClose={onClose} onGoHome={noop} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('links to the shared spreadsheet, opening safely in a new tab', () => {
    render(<SettingsModal version="1.0.0" onClose={noop} onGoHome={noop} />)
    const link = screen.getByRole('link', { name: /Tableur des activités/ })
    expect(link).toHaveAttribute(
      'href',
      'https://docs.google.com/spreadsheets/d/1kPmZExsNV8C05CuWg8tyiRA1l4Jm7CftUSMxPohm1w4/edit?usp=sharing',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('fires onGoHome from the "Retour à l\'accueil" button', () => {
    const onGoHome = vi.fn()
    render(<SettingsModal version="1.0.0" onClose={noop} onGoHome={onGoHome} />)
    fireEvent.click(screen.getByRole('button', { name: /Retour à l'accueil/ }))
    expect(onGoHome).toHaveBeenCalledTimes(1)
  })
})
