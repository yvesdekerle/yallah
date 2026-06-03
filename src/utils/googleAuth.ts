import type { GoogleUser } from '../types/user.ts'

/**
 * Google OAuth web Client ID, read from `VITE_GOOGLE_CLIENT_ID` at build time.
 * Empty string when unset (dev without a key, CI) — callers treat that as
 * "Google sign-in unavailable" and fall back to the demo flow.
 */
export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/** True when a Client ID is configured, so the Google button can work. */
export const googleAvailable = GOOGLE_CLIENT_ID.length > 0

/** Endpoint that returns the signed-in user's profile from an access token. */
export const GOOGLE_USERINFO_URL =
  'https://www.googleapis.com/oauth2/v3/userinfo'

/** Shape of the fields we read from the Google `userinfo` response. */
export interface GoogleUserInfo {
  sub?: string
  name?: string
  given_name?: string
  email?: string
  picture?: string
}

/**
 * Map a raw Google `userinfo` payload to our local {@link GoogleUser}. Prefers
 * the first name (`given_name`); falls back to the full `name`, then email.
 * Returns null if the payload lacks the bits we need to identify the user.
 */
export function toGoogleUser(raw: GoogleUserInfo): GoogleUser | null {
  if (!raw.sub || !raw.email) return null
  const name = raw.given_name?.trim() || raw.name?.trim() || raw.email
  return {
    sub: raw.sub,
    name,
    email: raw.email,
    ...(raw.picture ? { picture: raw.picture } : {}),
  }
}
