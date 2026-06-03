import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the OAuth hook: calling the returned `login` synchronously invokes the
// success callback with a fake access token (no real popup / provider needed).
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: {
    onSuccess: (r: { access_token: string }) => void
    onError?: () => void
  }) => {
    ;(globalThis as Record<string, unknown>).__triggerError = opts.onError
    return () => opts.onSuccess({ access_token: 'fake-token' })
  },
}))

import { GoogleSignInButton } from './GoogleSignInButton.tsx'

const userinfo = {
  sub: '42',
  given_name: 'Yves',
  name: 'Yves Dekerle',
  email: 'yves@example.com',
  picture: 'https://lh3.googleusercontent.com/a/abc',
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves the profile and calls onUser on success', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => userinfo,
    })
    const onUser = vi.fn()
    render(<GoogleSignInButton onUser={onUser} />)
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }))
    await waitFor(() =>
      expect(onUser).toHaveBeenCalledWith({
        sub: '42',
        name: 'Yves',
        email: 'yves@example.com',
        picture: 'https://lh3.googleusercontent.com/a/abc',
      }),
    )
  })

  it('calls onError when the userinfo request fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    })
    const onUser = vi.fn()
    const onError = vi.fn()
    render(<GoogleSignInButton onUser={onUser} onError={onError} />)
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onUser).not.toHaveBeenCalled()
  })
})
