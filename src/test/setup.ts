import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Force Google sign-in "unavailable" in the test env so <App> renders the
// disabled fallback button (the demo-only path) instead of the real
// GoogleSignInButton, which needs a GoogleOAuthProvider + popup. The Google
// flow itself is covered in GoogleSignInButton.test via a mocked hook. Vitest
// otherwise inherits VITE_GOOGLE_CLIENT_ID from .env.local.
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

// jsdom implements neither pointer capture nor element scrolling. The app calls
// these directly (every real browser supports them), so provide no-op stubs
// here — keeping the production source free of test-only `?.` guards.
Element.prototype.setPointerCapture = function () {}
Element.prototype.scrollTo = function () {}
