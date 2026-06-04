import { useState } from 'react'
import type { GoogleUser } from '../types/user.ts'
import { signInWithGoogle } from '../services/firebase/api.ts'
import { GoogleButton } from './GoogleButton.tsx'

interface GoogleSignInButtonProps {
  /** Called with the resolved profile once the Google popup sign-in succeeds. */
  onUser: (user: GoogleUser) => void
  /** Called on any failure (popup closed, network, Firebase not configured). */
  onError?: () => void
}

/**
 * Behavioural Google sign-in button. Runs the Firebase Auth Google popup flow
 * (`signInWithPopup`) via the lazily-loaded Firebase facade, then hands the
 * mapped profile to `onUser`. Rendered only when Firebase is configured;
 * otherwise the welcome screen shows a disabled {@link GoogleButton}.
 */
export function GoogleSignInButton({
  onUser,
  onError,
}: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    if (pending) return
    setPending(true)
    try {
      onUser(await signInWithGoogle())
    } catch {
      onError?.()
    } finally {
      setPending(false)
    }
  }

  return <GoogleButton onClick={() => void handleClick()} disabled={pending} />
}
