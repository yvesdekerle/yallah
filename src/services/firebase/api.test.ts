import { describe, it, expect, vi, afterEach } from 'vitest'

// In the test env Firebase is unavailable (see src/test/setup.ts), so the
// facade must degrade gracefully without ever loading the SDK client.
describe('api facade — Firebase unavailable', () => {
  it('exposes firebaseAvailable=false', async () => {
    expect((await import('./api.ts')).firebaseAvailable).toBe(false)
  })

  it('signInWithGoogle rejects', async () => {
    await expect((await import('./api.ts')).signInWithGoogle()).rejects.toThrow(
      /not configured/,
    )
  })

  it('writes are no-ops that resolve', async () => {
    const api = await import('./api.ts')
    await expect(
      api.saveVotes('u1', 'Y', { a001: { verdict: 'oui' } }),
    ).resolves.toBeUndefined()
    await expect(api.removeVote('u1', 'a001')).resolves.toBeUndefined()
    await expect(api.clearVotes('u1')).resolves.toBeUndefined()
    await expect(
      api.upsertUserProfile({ uid: 'u', name: 'n', email: 'e' }, '1.0.0'),
    ).resolves.toBeUndefined()
    await expect(api.signOutFirebase()).resolves.toBeUndefined()
  })

  it('subscriptions return a no-op unsubscribe', async () => {
    const api = await import('./api.ts')
    const unsub = api.subscribeGroupVotes(() => {})
    expect(typeof unsub).toBe('function')
    expect(() => unsub()).not.toThrow()
  })
})

describe('api facade — Firebase available (delegates to client)', () => {
  afterEach(() => {
    vi.doUnmock('./config.ts')
    vi.doUnmock('./client.ts')
    vi.resetModules()
  })

  it('forwards writes + listeners to the lazily-loaded client', async () => {
    vi.resetModules()
    vi.doMock('./config.ts', () => ({ firebaseAvailable: true }))
    const saveVotes = vi.fn(async () => {})
    const unsub = vi.fn()
    const subscribeGroupVotes = vi.fn(() => unsub)
    vi.doMock('./client.ts', () => ({ saveVotes, subscribeGroupVotes }))

    const api = await import('./api.ts')
    await api.saveVotes('u1', 'Yves', { a001: { verdict: 'oui' } })
    expect(saveVotes).toHaveBeenCalledWith('u1', 'Yves', { a001: { verdict: 'oui' } })

    const cb = vi.fn()
    const off = api.subscribeGroupVotes(cb)
    // The real listener attaches after the dynamic import resolves.
    await vi.waitFor(() => expect(subscribeGroupVotes).toHaveBeenCalledWith(cb))
    off()
    expect(unsub).toHaveBeenCalledTimes(1)
  })
})
