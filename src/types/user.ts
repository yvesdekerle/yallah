/**
 * Profile of a user signed in through Google SSO (client-side, no backend).
 * Derived from the Google `userinfo` endpoint after an implicit-flow login.
 * Stored locally under `yallah.googleUser.v1`. `name` holds the *first name*
 * (Google `given_name`), matching the demo participants which are first-name
 * only.
 */
export interface GoogleUser {
  /** Stable Google account id (`sub` claim). */
  sub: string
  /** First name (Google `given_name`, falling back to the full `name`). */
  name: string
  email: string
  /** Avatar URL. Optional — Google doesn't always return one. */
  picture?: string
}
