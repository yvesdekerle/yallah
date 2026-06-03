import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalShell } from './ModalShell.tsx'

describe('ModalShell', () => {
  it('renders children inside a labelled dialog', () => {
    render(
      <ModalShell ariaLabel="Mon titre" onClose={() => {}}>
        <p>Contenu</p>
      </ModalShell>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Mon titre' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  it('moves focus into the panel on open', () => {
    render(
      <ModalShell ariaLabel="t" onClose={() => {}}>
        <button>A</button>
      </ModalShell>,
    )
    const panel = screen.getByRole('dialog').firstElementChild
    expect(panel).toHaveFocus()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <ModalShell ariaLabel="t" onClose={onClose}>
        <button>A</button>
      </ModalShell>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape and backdrop taps when blocking (no onClose)', () => {
    render(
      <ModalShell ariaLabel="t" testId="shell">
        <button>A</button>
      </ModalShell>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('shell'))
    // Still mounted — nothing dismissed it.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on a backdrop tap but not on a panel tap', () => {
    const onClose = vi.fn()
    render(
      <ModalShell ariaLabel="t" onClose={onClose} testId="shell">
        <button>A</button>
      </ModalShell>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('shell'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab from the last focusable back to the first', () => {
    render(
      <ModalShell ariaLabel="t" onClose={() => {}}>
        <button>A</button>
        <button>B</button>
      </ModalShell>,
    )
    const [a, b] = screen.getAllByRole('button')
    b!.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(a).toHaveFocus()
  })

  it('traps Shift+Tab from the first focusable to the last', () => {
    render(
      <ModalShell ariaLabel="t" onClose={() => {}}>
        <button>A</button>
        <button>B</button>
      </ModalShell>,
    )
    const [a, b] = screen.getAllByRole('button')
    a!.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(b).toHaveFocus()
  })

  it('restores focus to the opener on unmount', () => {
    const { rerender } = render(
      <>
        <button data-testid="opener">ouvrir</button>
      </>,
    )
    const opener = screen.getByTestId('opener')
    opener.focus()
    expect(opener).toHaveFocus()

    rerender(
      <>
        <button data-testid="opener">ouvrir</button>
        <ModalShell ariaLabel="t" onClose={() => {}}>
          <button>X</button>
        </ModalShell>
      </>,
    )
    // Autofocus pulled focus into the modal.
    expect(opener).not.toHaveFocus()

    rerender(
      <>
        <button data-testid="opener">ouvrir</button>
      </>,
    )
    // …and it comes back when the modal unmounts.
    expect(opener).toHaveFocus()
  })
})
