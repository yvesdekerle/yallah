/**
 * The running app version, injected from package.json at build time via the
 * Vite `define` in vite.config.ts. Bump `package.json` "version" to release.
 *
 * Stored per-device in localStorage (see useAppVersionCheck) so the app can
 * tell when a user has loaded a newer build than they last ran.
 */
export const APP_VERSION = __APP_VERSION__

/** localStorage key holding the last app version this device ran. */
export const APP_VERSION_KEY = 'yallah.appVersion.v1'
