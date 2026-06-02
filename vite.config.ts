/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'

// Single source of truth for the app version: package.json, injected at build
// time so the running app can show it + detect upgrades against localStorage.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', 'e2e', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // Integer floors ~1-2 pts below the measured run (re-pinned 2026-06-03:
      // L85.4 / F78.9 / B81.4 / S83.2). Ratchet: any regression below these
      // fails `vitest run --coverage` (enforced in CI). Raise over time; do
      // NOT "tidy" these up to the exact measured %.
      thresholds: { lines: 84, functions: 77, branches: 80, statements: 82 },
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
