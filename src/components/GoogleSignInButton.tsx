import { useGoogleLogin } from '@react-oauth/google'
import type { GoogleUser } from '../types/user.ts'
import { GOOGLE_USERINFO_URL, toGoogleUser } from '../utils/googleAuth.ts'
import { GoogleButton } from './GoogleButton.tsx'

interface GoogleSignInButtonProps {
  /** Called with the resolved profile once sign-in + userinfo succeed. */
  onUser: (user: GoogleUser) => void
  /** Called on any failure (popup closed, network, malformed profile). */
  onError?: () => void
}

/**
 * Behavioural Google sign-in button. Runs the implicit OAuth flow via
 * `@react-oauth/google` (so MUST live under a `GoogleOAuthProvider`), then
 * exchanges the access token for the profile at the userinfo endpoint.
 * Rendered only when a Client ID is configured; otherwise the welcome screen
 * shows a disabled {@link GoogleButton} instead — which is why this component
 * never mounts (and never calls the hook) when Google is unavailable.
 */
export function GoogleSignInButton({
  onUser,
  onError,
}: GoogleSignInButtonProps) {
  const fetchProfile = async (accessToken: string) => {
    try {
      const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`userinfo ${res.status}`)
      const user = toGoogleUser(await res.json())
      if (user) onUser(user)
      else onError?.()
    } catch {
      onError?.()
    }
  }

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      void fetchProfile(tokenResponse.access_token)
    },
    onError: () => onError?.(),
  })

  return <GoogleButton onClick={() => login()} />
}
