import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 390, height: 844 },
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    env: {
      VITE_E2E: 'true',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
