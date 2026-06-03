import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { Splash } from './components/Splash.tsx'
import { loadActivities } from './data/activities.ts'
import { GOOGLE_CLIENT_ID, googleAvailable } from './utils/googleAuth.ts'

const root = createRoot(document.getElementById('root')!)

// Wrap the tree in the Google OAuth provider only when a Client ID is set, so
// the GIS script isn't pulled in (and no warning is logged) when Google sign-in
// is unavailable — the app then runs demo-only.
function withGoogle(children: ReactNode) {
  return googleAvailable ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  ) : (
    children
  )
}

// Paint the branded splash immediately, then swap in the app once the
// code-split activities chunk resolves — no white flash, no layout jump.
function start() {
  root.render(
    <StrictMode>
      <Splash />
    </StrictMode>,
  )
  loadActivities()
    .then((activities) => {
      root.render(
        <StrictMode>{withGoogle(<App activities={activities} />)}</StrictMode>,
      )
    })
    .catch(() => {
      // Same-origin static chunk, so this is rare (offline / cache miss). Offer
      // a retry rather than leaving the splash spinning forever.
      root.render(
        <StrictMode>
          <Splash error onRetry={start} />
        </StrictMode>,
      )
    })
}

start()
