import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoLightbox } from './PhotoLightbox.tsx'

const PHOTOS = ['url-1', 'url-2', 'url-3']

describe('PhotoLightbox', () => {
  it('shows the current index in the counter', () => {
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={1}
        onIndex={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('Escape calls onClose', () => {
    const onClose = vi.fn()
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={0}
        onIndex={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('arrow right advances; arrow left rewinds; clamped at the bounds', () => {
    const onIndex = vi.fn()
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={0}
        onIndex={onIndex}
        onClose={() => {}}
      />,
    )
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndex).toHaveBeenLastCalledWith(1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    // index is 0, clamp keeps it at 0
    expect(onIndex).toHaveBeenLastCalledWith(0)
  })

  it('shows next arrow when not on the last photo', async () => {
    const user = userEvent.setup()
    const onIndex = vi.fn()
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={0}
        onIndex={onIndex}
        onClose={() => {}}
      />,
    )
    await user.click(screen.getByLabelText('photo suivante'))
    expect(onIndex).toHaveBeenCalledWith(1)
    expect(screen.queryByLabelText('photo précédente')).not.toBeInTheDocument()
  })

  it('shows previous arrow when not on the first photo', () => {
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={1}
        onIndex={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByLabelText('photo précédente')).toBeInTheDocument()
    expect(screen.getByLabelText('photo suivante')).toBeInTheDocument()
  })

  it('clicking the close button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PhotoLightbox
        photos={PHOTOS}
        index={0}
        onIndex={() => {}}
        onClose={onClose}
      />,
    )
    await user.click(screen.getByLabelText('fermer la photo'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
