import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IdentityPicker } from './IdentityPicker.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

describe('IdentityPicker', () => {
  it('renders all 9 participants', () => {
    render(<IdentityPicker currentUserId={null} onPick={() => {}} />)
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
  })

  it('calls onPick with the tapped participant id', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.click(screen.getByTestId('picker-row-chloe'))
    expect(onPick).toHaveBeenCalledWith('chloe')
  })

  it('shows the "toi" badge on the current user row', () => {
    render(<IdentityPicker currentUserId="chloe" onPick={() => {}} />)
    const row = screen.getByTestId('picker-row-chloe')
    expect(row).toHaveTextContent('toi')
    const yvesRow = screen.getByTestId('picker-row-yves')
    expect(yvesRow).not.toHaveTextContent('toi')
  })

  it('does not render a close button when onClose is undefined (blocking mode)', () => {
    render(<IdentityPicker currentUserId={null} onPick={() => {}} />)
    expect(screen.queryByLabelText('fermer le sélecteur')).toBeNull()
  })

  it('renders a close button when onClose is defined and triggers it', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByLabelText('fermer le sélecteur'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape when dismissable', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when blocking', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText('Adé')).toBeInTheDocument()
  })

  it('closes on backdrop tap when dismissable', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('picker-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT close on backdrop tap when blocking', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.click(screen.getByTestId('picker-backdrop'))
    expect(screen.getByText('Adé')).toBeInTheDocument()
  })
})
