import 'fake-indexeddb/auto'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { putPhoto, getPhoto, deletePhoto, resizeImage } from './photoStore.ts'

function makeBlob(text: string): Blob {
  return new Blob([text], { type: 'image/jpeg' })
}

describe('photoStore', () => {
  it('round-trips a blob by id', async () => {
    await putPhoto('p1', makeBlob('hello'))
    const got = await getPhoto('p1')
    expect(got).toBeInstanceOf(Blob)
    expect(await got!.text()).toBe('hello')
  })

  it('returns undefined for a missing id', async () => {
    expect(await getPhoto('nope')).toBeUndefined()
  })

  it('replaces an existing blob on put', async () => {
    await putPhoto('p2', makeBlob('first'))
    await putPhoto('p2', makeBlob('second'))
    const got = await getPhoto('p2')
    expect(await got!.text()).toBe('second')
  })

  it('deletes a blob', async () => {
    await putPhoto('p3', makeBlob('bye'))
    await deletePhoto('p3')
    expect(await getPhoto('p3')).toBeUndefined()
  })

  it('delete is a no-op for a missing id', async () => {
    await expect(deletePhoto('ghost')).resolves.toBeUndefined()
  })

  it('falls back to image/jpeg when the blob has no MIME type', async () => {
    await putPhoto('pt', new Blob(['x'])) // type === ''
    const got = await getPhoto('pt')
    expect(got?.type).toBe('image/jpeg')
  })
})

describe('resizeImage', () => {
  const realCreateImageBitmap = globalThis.createImageBitmap
  const bitmap = (w: number, h: number) =>
    vi.fn(async () => ({ width: w, height: h, close: vi.fn() })) as unknown as typeof createImageBitmap

  afterEach(() => {
    globalThis.createImageBitmap = realCreateImageBitmap
    vi.restoreAllMocks()
  })

  it('downscales within the bounds and returns a jpeg blob', async () => {
    globalThis.createImageBitmap = bitmap(1000, 800)
    const ctx = { drawImage: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (cb: BlobCallback) => cb(new Blob(['img'], { type: 'image/jpeg' })),
    )
    const out = await resizeImage(new Blob(['src']), 400, 500)
    expect(out.type).toBe('image/jpeg')
    // scale = min(1, 400/1000, 500/800) = 0.4 → 400×320
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 320)
  })

  it('rejects when the 2D context is unavailable', async () => {
    globalThis.createImageBitmap = bitmap(10, 10)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(resizeImage(new Blob(['x']), 100, 100)).rejects.toThrow(
      '2D canvas context',
    )
  })

  it('rejects when toBlob yields null', async () => {
    globalThis.createImageBitmap = bitmap(10, 10)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (cb: BlobCallback) => cb(null),
    )
    await expect(resizeImage(new Blob(['x']), 100, 100)).rejects.toThrow(
      'toBlob failed',
    )
  })
})
