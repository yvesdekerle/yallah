import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Force Firebase "unavailable" in the test env so <App> renders the disabled
// fallback button (the demo-only path) instead of the real GoogleSignInButton,
// which would open a Firebase Auth popup. The sign-in flow itself is covered in
// GoogleSignInButton.test via a mocked Firebase facade. Vitest otherwise
// inherits VITE_FIREBASE_* from .env.local.
vi.stubEnv('VITE_FIREBASE_API_KEY', '')
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '')
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
vi.stubEnv('VITE_FIREBASE_APP_ID', '')

// jsdom implements neither pointer capture nor element scrolling. The app calls
// these directly (every real browser supports them), so provide no-op stubs
// here — keeping the production source free of test-only `?.` guards.
Element.prototype.setPointerCapture = function () {}
Element.prototype.scrollTo = function () {}
