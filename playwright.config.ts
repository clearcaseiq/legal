import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests for the plaintiff web app.
 *
 * Start the web dev server first, then run:
 *   pnpm --filter caseiq-web dev
 *   pnpm test:e2e
 *
 * Optional: `E2E_BASE_URL=http://localhost:3001 pnpm test:e2e` if using another port.
 *
 * Install browsers once: `pnpm test:e2e:install`
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
