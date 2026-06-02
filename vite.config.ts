/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
      // Integer floors just below the measured baseline. Ratchet: any
      // regression below these fails `vitest run --coverage` (enforced in CI).
      // Raise over time; do NOT "tidy" these up to the exact measured %.
      thresholds: { lines: 66, functions: 59, branches: 67, statements: 63 },
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
