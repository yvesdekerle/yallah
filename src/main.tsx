import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Splash } from './components/Splash.tsx'
import { loadActivities } from './data/activities.ts'

const root = createRoot(document.getElementById('root')!)

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
        <StrictMode>
          <App activities={activities} />
        </StrictMode>,
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
