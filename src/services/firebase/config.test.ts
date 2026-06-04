import { describe, it, expect, vi, afterEach } from 'vitest'

// config.ts reads `import.meta.env` at module-eval, so each case resets the
// module registry and stubs the env it wants before importing.
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

function stub(env: Record<string, string>) {
  vi.resetModules()
  for (const k of [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ]) {
    vi.stubEnv(k, env[k] ?? '')
  }
}

describe('firebaseAvailable', () => {
  it('is false when every key is empty', async () => {
    stub({})
    expect((await import('./config.ts')).firebaseAvailable).toBe(false)
  })

  it('is true when the four required keys are present', async () => {
    stub({
      VITE_FIREBASE_API_KEY: 'k',
      VITE_FIREBASE_AUTH_DOMAIN: 'd',
      VITE_FIREBASE_PROJECT_ID: 'proj',
      VITE_FIREBASE_APP_ID: 'a',
    })
    const m = await import('./config.ts')
    expect(m.firebaseAvailable).toBe(true)
    expect(m.firebaseConfig.projectId).toBe('proj')
  })

  it('stays false when only some keys are set', async () => {
    stub({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'proj' })
    expect((await import('./config.ts')).firebaseAvailable).toBe(false)
  })
})
