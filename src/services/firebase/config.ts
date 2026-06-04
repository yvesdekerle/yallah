/**
 * Firebase web config, read from `VITE_FIREBASE_*` env vars at build time.
 *
 * This module imports NO Firebase SDK — it only reads `import.meta.env`, so it
 * is cheap and safe to import statically (e.g. from the welcome screen) without
 * dragging the Firebase bundle into the eager entry chunk. The heavy SDK lives
 * in `./client.ts`, which is only ever reached through a dynamic `import()`
 * (see `./api.ts`).
 *
 * When the required keys are missing (local dev without a project, CI, e2e),
 * {@link firebaseAvailable} is `false` and the app falls back to the demo flow —
 * exactly as it did before Firebase, when `VITE_GOOGLE_CLIENT_ID` was unset.
 */
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const env = import.meta.env

export const firebaseConfig: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
}

/**
 * True when the minimum config needed to initialise Firebase + sign in is
 * present. `storageBucket` / `messagingSenderId` are optional for our use
 * (Auth + Firestore only), so they're not required here.
 */
export const firebaseAvailable: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)
