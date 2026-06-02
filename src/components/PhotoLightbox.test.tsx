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

  // The sliding filmstrip (the lightbox root's first child) carries the
  // pointer-drag handlers.
  const track = (): HTMLElement =>
    screen.getByTestId('photo-lightbox').firstElementChild as HTMLElement

  it('swiping left past the threshold advances to the next photo', () => {
    const onIndex = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndex={onIndex} onClose={vi.fn()} />,
    )
    const t = track()
    fireEvent.pointerDown(t, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(t, { clientX: 110, pointerId: 1 }) // dx = -90
    fireEvent.pointerUp(t, { pointerId: 1 })
    expect(onIndex).toHaveBeenCalledWith(1)
  })

  it('swiping right past the threshold rewinds to the previous photo', () => {
    const onIndex = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={1} onIndex={onIndex} onClose={vi.fn()} />,
    )
    const t = track()
    fireEvent.pointerDown(t, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(t, { clientX: 200, pointerId: 1 }) // dx = +100
    fireEvent.pointerUp(t, { pointerId: 1 })
    expect(onIndex).toHaveBeenCalledWith(0)
  })

  it('a drag shorter than the threshold does not navigate', () => {
    const onIndex = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={1} onIndex={onIndex} onClose={vi.fn()} />,
    )
    const t = track()
    fireEvent.pointerDown(t, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(t, { clientX: 175, pointerId: 1 }) // dx = -25
    fireEvent.pointerUp(t, { pointerId: 1 })
    expect(onIndex).not.toHaveBeenCalled()
  })

  it('does not advance past the last photo (rubber-band edge)', () => {
    const onIndex = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={2} onIndex={onIndex} onClose={vi.fn()} />,
    )
    const t = track()
    fireEvent.pointerDown(t, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(t, { clientX: 80, pointerId: 1 }) // dx = -120, but already last
    fireEvent.pointerUp(t, { pointerId: 1 })
    expect(onIndex).not.toHaveBeenCalled()
  })

  it('a plain tap on the backdrop closes the viewer', () => {
    const onClose = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndex={vi.fn()} onClose={onClose} />,
    )
    fireEvent.click(screen.getByTestId('photo-lightbox'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('the synthetic click after a real swipe does not also close', () => {
    const onClose = vi.fn()
    const onIndex = vi.fn()
    render(
      <PhotoLightbox photos={PHOTOS} index={0} onIndex={onIndex} onClose={onClose} />,
    )
    const t = track()
    fireEvent.pointerDown(t, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(t, { clientX: 110, pointerId: 1 }) // moved + past threshold
    fireEvent.pointerUp(t, { pointerId: 1 })
    fireEvent.click(screen.getByTestId('photo-lightbox'))
    expect(onIndex).toHaveBeenCalledWith(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
