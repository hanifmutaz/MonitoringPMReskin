// tests/auth.setup.js
// Login sekali sebagai Admin, simpan cookie/session-nya ke
// playwright/.auth/admin.json - semua test lain reuse ini (via
// storageState di playwright.config.js) biar gak login ulang tiap test.
//
// GANTI 2 BARIS INI sesuai user Admin yang beneran ada di database lu:
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin1234567';

import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/admin.json';

setup('login sebagai Admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(TEST_USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  // Tunggu sampai beneran masuk (redirect ke halaman utama, bukan /login lagi)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

  await page.context().storageState({ path: authFile });
});
