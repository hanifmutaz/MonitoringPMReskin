// playwright.config.js
// Config Playwright untuk Phase 13 (docs/frontend/MIGRATION-PLAN.md) -
// viewport screenshot + axe-core a11y scan + keyboard-nav check.
//
// SEBELUM JALANIN INI:
// 1. Backend jalan di http://localhost:4000 (npm start di folder backend/,
//    .env terisi DATABASE_URL yang valid)
// 2. Frontend dev server jalan di http://localhost:5173 (npm run dev di
//    folder frontend/)
// 3. Ada user Admin aktif di database dengan username/password yang tau -
//    isi di tests/auth.setup.js (TEST_USERNAME/TEST_PASSWORD di bawah)
//
// CARA JALANIN:
//   npm install
//   npx playwright install chromium   (browser diunduh sekali di sini,
//                                       bukan lagi di sandbox Claude)
//   npm test
//
// Screenshot hasil ada di test-results/ setelah selesai. Report HTML bisa
// dibuka via `npx playwright show-report`.
import { defineConfig, devices } from '@playwright/test';

// Di CI (env CI=true) Playwright menyalakan backend + frontend sendiri.
// Backend butuh DATABASE_URL/JWT_SECRET dari environment job (lihat
// .github/workflows/e2e.yml). Lokal: jalankan manual seperti di atas.
const webServer = process.env.CI
  ? [
      {
        command: 'npm --prefix backend start',
        url: 'http://localhost:4000/health/ready',
        timeout: 60_000,
        reuseExistingServer: false,
      },
      {
        command: 'npm --prefix frontend run dev',
        url: 'http://localhost:5173',
        timeout: 60_000,
        reuseExistingServer: false,
      },
    ]
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // sequential - biar gampang baca report per halaman
    workers: 1,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  webServer,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'tablet-768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
});
