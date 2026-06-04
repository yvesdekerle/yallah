import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const getMyVotes = vi.fn()
vi.mock('../services/firebase/api.ts', () => ({
  getMyVotes: (uid: string) => getMyVotes(uid),
}))

import { useRemoteVoteHydration } from './useRemoteVoteHydration.ts'

beforeEach(() => {
  getMyVotes.mockReset()
})

describe('useRemoteVoteHydration', () => {
  it('does nothing when uid is null', () => {
    const replace = vi.fn()
    renderHook(() => useRemoteVoteHydration(null, replace))
    expect(getMyVotes).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('replaces local history with the remote votes when present', async () => {
    getMyVotes.mockResolvedValue([{ id: 'a001', verdict: 'oui' }])
    const replace = vi.fn()
    renderHook(() => useRemoteVoteHydration('u1', replace))
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith([{ id: 'a001', verdict: 'oui' }]),
    )
  })

  it('leaves history untouched when the remote has no votes', async () => {
    getMyVotes.mockResolvedValue([])
    const replace = vi.fn()
    renderHook(() => useRemoteVoteHydration('u1', replace))
    await waitFor(() => expect(getMyVotes).toHaveBeenCalledWith('u1'))
    expect(replace).not.toHaveBeenCalled()
  })
})
