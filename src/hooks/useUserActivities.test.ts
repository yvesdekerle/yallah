import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useUserActivities, type UserActivityInput } from './useUserActivities.ts'
import { getPhoto } from '../data/photoStore.ts'
import { USER_ACTIVITIES_KEY } from '../data/userActivities.ts'

// Keep the real IndexedDB store (fake-indexeddb) and the real localStorage
// layer — only `resizeImage` needs stubbing, since it relies on
// createImageBitmap + <canvas>, which jsdom doesn't implement. The identity
// passthrough lets the real putPhoto persist the picked File verbatim.
vi.mock('../data/photoStore.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/photoStore.ts')>()
  return { ...actual, resizeImage: vi.fn(async (blob: Blob) => blob) }
})

const baseInput = (over: Partial<UserActivityInput> = {}): UserActivityInput => ({
  title: 'Mon spot',
  tags: [],
  category: 'Autre',
  location: '',
  transit: '',
  description: '',
  price: '',
  rating: 0,
  pepite: false,
  secret: false,
  photos: [],
  ...over,
})

const urlPhoto = (url: string): UserActivityInput['photos'][number] => ({
  kind: 'ref',
  ref: { kind: 'url', url },
})

const filePhoto = (): UserActivityInput['photos'][number] => ({
  kind: 'file',
  file: new File(['img-bytes'], 'p.jpg', { type: 'image/jpeg' }),
})

describe('useUserActivities', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // NB: no IndexedDB reset — photoStore memoizes its db connection at module
    // scope, so reassigning indexedDB would be a no-op. Each add() uses a fresh
    // crypto.randomUUID photo id, so cross-test blobs never collide.
  })

  it('add persists a url-photo activity and exposes it via userActivities', async () => {
    const { result } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(
        baseInput({ title: 'Plage', photos: [urlPhoto('https://x/p.jpg')] }),
      )
    })
    await waitFor(() =>
      expect(result.current.userActivities[0]?.photoUrls).toEqual([
        'https://x/p.jpg',
      ]),
    )
    const a = result.current.userActivities[0]!
    expect(a.title).toBe('Plage')
    expect(a.userAdded).toBe(true)
    expect(result.current.stored).toHaveLength(1)
    expect(
      JSON.parse(window.localStorage.getItem(USER_ACTIVITIES_KEY)!),
    ).toHaveLength(1)
  })

  it('update replaces the entry by id, preserving id/number/createdAt', async () => {
    const { result } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(
        baseInput({ title: 'V1', photos: [urlPhoto('https://x/1.jpg')] }),
      )
    })
    await waitFor(() => expect(result.current.stored).toHaveLength(1))
    const before = result.current.stored[0]!
    await act(async () => {
      await result.current.update(
        before.id,
        baseInput({ title: 'V2', photos: [urlPhoto('https://x/1.jpg')] }),
      )
    })
    await waitFor(() => expect(result.current.stored[0]?.title).toBe('V2'))
    const after = result.current.stored[0]!
    expect(result.current.stored).toHaveLength(1)
    expect(after.id).toBe(before.id)
    expect(after.number).toBe(before.number)
    expect(after.createdAt).toBe(before.createdAt)
  })

  it('tags a new activity with its creator and preserves it across edits', async () => {
    const { result } = renderHook(() => useUserActivities())
    const creator = { uid: 'yves', name: 'Yves' }
    let added: { createdBy?: { uid: string; name: string } } | undefined
    await act(async () => {
      added = await result.current.add(
        baseInput({ title: 'V1', photos: [urlPhoto('https://x/1.jpg')] }),
        creator,
      )
    })
    expect(added?.createdBy).toEqual(creator)
    await waitFor(() => expect(result.current.stored[0]?.createdBy).toEqual(creator))

    // Editing the activity keeps the original creator (no creator passed).
    const id = result.current.stored[0]!.id
    await act(async () => {
      await result.current.update(id, baseInput({ title: 'V2' }))
    })
    await waitFor(() => expect(result.current.stored[0]?.title).toBe('V2'))
    expect(result.current.stored[0]?.createdBy).toEqual(creator)
  })

  it('remove deletes the activity from state and localStorage', async () => {
    const { result } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(baseInput({ photos: [urlPhoto('https://x/1.jpg')] }))
    })
    await waitFor(() => expect(result.current.stored).toHaveLength(1))
    const id = result.current.stored[0]!.id
    await act(async () => {
      await result.current.remove(id)
    })
    await waitFor(() => expect(result.current.stored).toHaveLength(0))
    expect(
      JSON.parse(window.localStorage.getItem(USER_ACTIVITIES_KEY)!),
    ).toEqual([])
  })

  it('add stores an uploaded photo in IndexedDB; remove deletes it', async () => {
    const { result } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(baseInput({ photos: [filePhoto()] }))
    })
    await waitFor(() =>
      expect(result.current.userActivities[0]?.photoUrls?.[0]).toMatch(/^blob:/),
    )
    const ref = result.current.stored[0]!.photoRefs[0]!
    if (ref.kind !== 'upload') throw new Error('expected an upload ref')
    expect(await getPhoto(ref.id)).toBeInstanceOf(Blob)

    await act(async () => {
      await result.current.remove(result.current.stored[0]!.id)
    })
    await waitFor(() => expect(result.current.stored).toHaveLength(0))
    expect(await getPhoto(ref.id)).toBeUndefined()
  })

  it('update deletes an orphaned uploaded photo from IndexedDB', async () => {
    const { result } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(baseInput({ photos: [filePhoto()] }))
    })
    await waitFor(() =>
      expect(result.current.userActivities[0]?.photoUrls?.[0]).toMatch(/^blob:/),
    )
    const oldRef = result.current.stored[0]!.photoRefs[0]!
    if (oldRef.kind !== 'upload') throw new Error('expected an upload ref')
    expect(await getPhoto(oldRef.id)).toBeInstanceOf(Blob)

    // Replace the upload with a url photo → the old upload blob is orphaned.
    await act(async () => {
      await result.current.update(
        result.current.stored[0]!.id,
        baseInput({ photos: [urlPhoto('https://x/new.jpg')] }),
      )
    })
    await waitFor(() =>
      expect(result.current.stored[0]?.photoRefs[0]?.kind).toBe('url'),
    )
    expect(await getPhoto(oldRef.id)).toBeUndefined()
  })

  it('revokes created object URLs on unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { result, unmount } = renderHook(() => useUserActivities())
    await act(async () => {
      await result.current.add(baseInput({ photos: [filePhoto()] }))
    })
    await waitFor(() =>
      expect(result.current.userActivities[0]?.photoUrls?.[0]).toMatch(/^blob:/),
    )
    revokeSpy.mockClear()
    unmount()
    expect(revokeSpy).toHaveBeenCalled()
    revokeSpy.mockRestore()
  })
})
