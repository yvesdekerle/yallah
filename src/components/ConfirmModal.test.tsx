import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from './ConfirmModal.tsx'

describe('ConfirmModal', () => {
  it('renders title and message', () => {
    render(
      <ConfirmModal
        title="Tout effacer ?"
        message="Cette action est irréversible."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('Tout effacer ?')).toBeInTheDocument()
    expect(
      screen.getByText('Cette action est irréversible.'),
    ).toBeInTheDocument()
  })

  it('uses custom labels', () => {
    render(
      <ConfirmModal
        title="t"
        confirmLabel="Vas-y"
        cancelLabel="Non merci"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('Vas-y')).toBeInTheDocument()
    expect(screen.getByText('Non merci')).toBeInTheDocument()
  })

  it('confirm button triggers onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmModal
        title="t"
        confirmLabel="Vas-y"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    await user.click(screen.getByText('Vas-y'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancel button triggers onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        title="t"
        cancelLabel="Non merci"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByText('Non merci'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Escape key triggers onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal title="t" onConfirm={() => {}} onCancel={onCancel} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('backdrop click triggers onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmModal title="t" onConfirm={() => {}} onCancel={onCancel} />,
    )
    await user.click(screen.getByRole('dialog'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
