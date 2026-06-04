import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the Firebase facade so no SDK / popup is needed.
const signInWithGoogle = vi.fn()
vi.mock('../services/firebase/api.ts', () => ({
  signInWithGoogle: () => signInWithGoogle(),
}))

import { GoogleSignInButton } from './GoogleSignInButton.tsx'

const profile = {
  uid: '42',
  name: 'Yves Dekerle',
  email: 'yves@example.com',
  picture: 'https://lh3.googleusercontent.com/a/abc',
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset()
  })

  it('resolves the profile and calls onUser on success', async () => {
    signInWithGoogle.mockResolvedValue(profile)
    const onUser = vi.fn()
    render(<GoogleSignInButton onUser={onUser} />)
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }))
    await waitFor(() => expect(onUser).toHaveBeenCalledWith(profile))
  })

  it('calls onError when the sign-in fails', async () => {
    signInWithGoogle.mockRejectedValue(new Error('popup closed'))
    const onUser = vi.fn()
    const onError = vi.fn()
    render(<GoogleSignInButton onUser={onUser} onError={onError} />)
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onUser).not.toHaveBeenCalled()
  })
})
