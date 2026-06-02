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

  it('links to the shared spreadsheet, opening safely in a new tab', () => {
    render(<SettingsModal version="1.0.0" onClose={() => {}} />)
    const link = screen.getByRole('link', { name: /Tableur des activités/ })
    expect(link).toHaveAttribute(
      'href',
      'https://docs.google.com/spreadsheets/d/1kPmZExsNV8C05CuWg8tyiRA1l4Jm7CftUSMxPohm1w4/edit?usp=sharing',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
