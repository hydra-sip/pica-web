import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra el sistema levantado (PICA-437): el back de e2e/docker-compose.yml y el front con `vite preview`.
 * E2E_BASE_URL y E2E_API_URL apuntan a otro lado (por ejemplo, staging) sin tocar nada más.
 */
const CI = !!process.env.CI;
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e/tests',
  // Cada test arma sus datos, así que pueden correr en paralelo
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Sin E2E_BASE_URL levanta el build con `vite preview`; el back tiene que estar arriba (npm run e2e:back)
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run e2e:front',
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 180_000,
      },
});
