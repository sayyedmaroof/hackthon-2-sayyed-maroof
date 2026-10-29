import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests for ScentBuild Studio.
 * Run with: npx playwright test
 *
 * Uses an already-running `next dev` server on port 3000 when present,
 * otherwise boots one (`npm run dev`) for the duration of the run.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // tests share a remote demo database; keep order deterministic
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalTeardown: './e2e/teardown.ts',
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000/api/auth/me',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
