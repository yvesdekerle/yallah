/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'

// Single source of truth for the app version: package.json, injected at build
// time so the running app can show it + detect upgrades against localStorage.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string }

// Emit a static `version.json` into the build so the deployed CDN advertises
// the live version. `useDeployedVersionPoll` fetches it (no-store) to detect a
// new deploy and reload stale tabs — works in every mode, no Firebase needed.
function emitVersionJson(version: string): Plugin {
  return {
    name: 'yallah-emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ version })}\n`,
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), emitVersionJson(pkg.version)],
  build: {
    rollupOptions: {
      output: {
        // Pin the Firebase SDK into its own vendor chunk. It's only ever
        // reached through a dynamic import (services/firebase/client.ts), so
        // this `firebase-*` chunk loads on demand — never in the eager entry.
        // `scripts/check-bundle-size.ts` excludes it from the lazy budget (a
        // fixed third-party cost) and asserts it never leaks into `index-*`.
        manualChunks(id) {
          if (
            id.includes('node_modules/firebase/') ||
            id.includes('node_modules/@firebase/')
          ) {
            return 'firebase'
          }
          return undefined
        },
      },
    },
  },
  // Pre-bundle the dependencies that are only reached through lazy `import()`
  // (Leaflet maps, the add-activity form). Without this Vite discovers them
  // mid-session on first use and re-optimises, which serves a transient
  // `504 (Outdated Optimize Dep)` + full reload — long enough to blank the page
  // and flake the Playwright e2e on a cold dev server. Bundling them in the
  // initial pass removes the re-optimisation.
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
  server: {
    // Crawl the app entry at startup so the optimizer runs before the first
    // navigation rather than on first request.
    warmup: { clientFiles: ['./src/main.tsx'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', 'e2e', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // Integer floors ~2 pts below the measured run (re-pinned 2026-06-03 after
      // the audit test pass: L95.3 / F90.1 / B89.7 / S92.7). Ratchet: any
      // regression below these fails `vitest run --coverage` (enforced in CI).
      // Raise over time; do NOT "tidy" these up to the exact measured %.
      thresholds: { lines: 93, functions: 88, branches: 87, statements: 90 },
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**',
        'src/data/activities.ts',
        'src/data/participants.ts',
        'src/data/*.json',
        'src/icons/index.tsx',
        'src/constants/swipe.ts',
        'src/utils/theme.ts',
      ],
    },
  },
})
