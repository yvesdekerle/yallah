import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhotoPickerPanel } from './PhotoPickerPanel.tsx'
import type { PhotoItem } from '../hooks/useAddActivityForm.ts'

const noop = () => {}
const photo = (preview: string): PhotoItem => ({
  draft: { kind: 'ref', ref: { kind: 'url', url: preview } },
  preview,
  createdUrl: false,
})

function renderPanel(photos: PhotoItem[]) {
  render(
    <PhotoPickerPanel
      photos={photos}
      urlInput=""
      urlError=""
      onAddFiles={noop}
      onRemovePhoto={noop}
      onUrlInputChange={noop}
      onAddUrlPhoto={noop}
    />,
  )
}

describe('PhotoPickerPanel', () => {
  it('renders a hero thumbnail for the first photo', () => {
    renderPanel([photo('https://example.com/a.jpg')])
    expect(screen.getByLabelText('photo principale')).toBeInTheDocument()
  })

  it('escapes a quote in the preview URL so it stays inside url() (no breakout)', () => {
    // A preview carrying a quote — e.g. a stale value that bypassed the
    // paste-time isSafePhotoUrl check — is hex-escaped by cssUrlValue, so the
    // quote cannot terminate the url('…') string early. The whole path
    // therefore survives intact inside the url(); without escaping the value
    // would break at the quote.
    renderPanel([photo("https://x/a'b.jpg")])
    const style = screen.getByLabelText('photo principale').getAttribute('style') ?? ''
    expect(style).toContain("url(")
    expect(style).toContain("a'b.jpg")
  })

  it('calls onRemovePhoto with the photo index', async () => {
    const onRemovePhoto = vi.fn()
    render(
      <PhotoPickerPanel
        photos={[photo('https://x/a.jpg'), photo('https://x/b.jpg')]}
        urlInput=""
        urlError=""
        onAddFiles={noop}
        onRemovePhoto={onRemovePhoto}
        onUrlInputChange={noop}
        onAddUrlPhoto={noop}
      />,
    )
    screen.getByLabelText('supprimer la photo 2').click()
    expect(onRemovePhoto).toHaveBeenCalledWith(1)
  })
})
