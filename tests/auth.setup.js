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
