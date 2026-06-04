import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

let emit: (u: unknown) => void = () => {}
const unsub = vi.fn()
const subscribeAuth = vi.fn((cb: (u: unknown) => void) => {
  emit = cb
  return unsub
})
const upsertUserProfile = vi.fn(async (_u: unknown, _v: string) => {})

vi.mock('../services/firebase/api.ts', () => ({
  subscribeAuth: (cb: (u: unknown) => void) => subscribeAuth(cb),
  upsertUserProfile: (u: unknown, v: string) => upsertUserProfile(u, v),
}))

import { useFirebaseAuthSync } from './useFirebaseAuthSync.ts'
import { APP_VERSION } from '../constants/version.ts'

beforeEach(() => {
  subscribeAuth.mockClear()
  upsertUserProfile.mockClear()
  unsub.mockClear()
})

describe('useFirebaseAuthSync', () => {
  it('adopts the signed-in user + mirrors the profile, and clears on sign-out', () => {
    const setGoogleUser = vi.fn()
    renderHook(() => useFirebaseAuthSync(setGoogleUser))

    const user = { uid: 'u1', name: 'Yves', email: 'y@b.co' }
    emit(user)
    expect(setGoogleUser).toHaveBeenCalledWith(user)
    expect(upsertUserProfile).toHaveBeenCalledWith(user, APP_VERSION)

    emit(null)
    expect(setGoogleUser).toHaveBeenLastCalledWith(null)
    // No profile write on sign-out.
    expect(upsertUserProfile).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useFirebaseAuthSync(vi.fn()))
    unmount()
    expect(unsub).toHaveBeenCalledTimes(1)
  })
})
