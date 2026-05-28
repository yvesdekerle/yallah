import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { putPhoto, getPhoto, deletePhoto } from './photoStore.ts'

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
})
