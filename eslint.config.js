import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'test-results', 'playwright-report', 'src/data/activities.json']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      // Browser globals only — app code, tests (jsdom) and e2e run in a browser
      // context. Node globals are added back for tooling below.
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Node-context tooling: the build/test config and the dev scripts run in
  // Node, so they get Node globals (process, __dirname, …).
  {
    files: ['scripts/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: globals.node },
  },
  // Type-aware rules — scoped to the app source (tsconfig.app includes `src`).
  // The floating-promise risk lives here (handlers `void` their async work by
  // hand). Tests are excluded: RTL's synchronous `act()` returns a thenable
  // that would trip no-floating-promises on every call.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
])
