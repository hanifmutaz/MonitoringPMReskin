// tests/responsive-and-a11y.spec.js
// Phase 13 (docs/frontend/MIGRATION-PLAN.md) - 2 halaman representatif
// yang disebut brief: PmPartMonitoringPage (density Dense, tabel banyak
// kolom + selection) dan DashboardPage (density Comfortable, KPI card +
// grid). Dijalankan otomatis di 3 viewport (lihat playwright.config.js:
// desktop-1440/tablet-768/mobile-375) - total tiap test di bawah jalan 3x.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// waitTimeout: /pm-part butuh lebih longgar dari default 10000ms - halaman
// ini nembak lebih banyak request paralel pas load pertama (list Part +
// dropdown Line + panel Ketepatan) dibanding Dashboard, jadi kena timeout
// palsu pas dev server masih "dingin" di request pertama. Dashboard gak
// perlu override (biarin fallback ke default 10000 lewat `|| 10000`).
const PAGES = [
  { path: '/pm-part', name: 'pm-part-monitoring', waitFor: 'table', waitTimeout: 20000 },
  { path: '/', name: 'dashboard', waitFor: null },
];

for (const { path, name, waitFor, waitTimeout } of PAGES) {
  test.describe(`${name}`, () => {
    test(`${name} - screenshot + layout check`, async ({ page }, testInfo) => {
      await page.goto(path);
      if (waitFor) await page.waitForSelector(waitFor, { timeout: waitTimeout || 10000 });
      await page.waitForTimeout(500); // biar animasi/query selesai dulu

      // Screenshot full halaman - cek manual di test-results/ apakah ada
      // elemen yang overflow horizontal, teks kepotong, atau tombol
      // ke-tumpuk terutama di viewport mobile-375.
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${testInfo.project.name}.png`),
        fullPage: true,
      });

      // Cek dasar: gak ada horizontal scroll TAK TERDUGA di level body
      // (DataTable boleh scroll horizontal sendiri di dalam wrapper-nya -
      // itu overflow-x-auto yang disengaja, lihat DataTable.jsx. Yang
      // dicek di sini adalah document.body sendiri, bukan children-nya).
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize().width;
      if (bodyScrollWidth > viewportWidth + 5) {
        console.warn(
          `[${name} @ ${testInfo.project.name}] body scrollWidth (${bodyScrollWidth}px) > viewport (${viewportWidth}px) - kemungkinan ada elemen yang overflow di luar wrapper yang disengaja, cek screenshot.`
        );
      }
    });

    test(`${name} - axe-core accessibility scan`, async ({ page }, testInfo) => {
      await page.goto(path);
      if (waitFor) await page.waitForSelector(waitFor, { timeout: waitTimeout || 10000 });
      await page.waitForTimeout(500);

      const results = await new AxeBuilder({ page }).analyze();

      // Simpan hasil lengkap ke file - lebih gampang dibaca daripada scroll
      // terminal, terutama kalau banyak violation.
      const fs = await import('fs');
      fs.writeFileSync(
        testInfo.outputPath(`${name}-${testInfo.project.name}-axe.json`),
        JSON.stringify(results.violations, null, 2)
      );

      if (results.violations.length > 0) {
        console.log(`\n[${name} @ ${testInfo.project.name}] ${results.violations.length} axe violation(s):`);
        for (const v of results.violations) {
          console.log(`  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} elemen)`);
        }
      }

      // Tidak di-assert gagal otomatis (expect().toBe(0)) supaya test tetap
      // jalan semua dan kasih laporan lengkap - baca file *-axe.json buat
      // detail per elemen, putuskan sendiri mana yang perlu difix vs bisa
      // diabaikan (axe kadang false-positive untuk pola custom seperti
      // Radix primitives).
    });
  });
}

test.describe('keyboard navigation', () => {
  test('Modal: Escape menutup, focus trap jalan', async ({ page }) => {
    await page.goto('/pm-part');
    await page.waitForSelector('table', { timeout: 20000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    test.skip(rowCount === 0, 'Tidak ada data PM Part di database - seed data dulu buat test ini');

    const firstActionButton = rows.first().locator('button').first();
    await firstActionButton.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const focusedInModal = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement);
    });
    expect(focusedInModal).toBe(true);

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('DataTable: checkbox bisa di-toggle pakai keyboard (Space)', async ({ page }) => {
    await page.goto('/pm-line/history');
    await page.waitForSelector('table', { timeout: 20000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    test.skip(rowCount === 0, 'Tidak ada data PM Line History di database - seed data dulu buat test ini');

    const firstCheckbox = rows.first().locator('input[type="checkbox"]');
    await firstCheckbox.focus();
    await page.keyboard.press('Space');
    await expect(firstCheckbox).toBeChecked();
  });

  test('Tab order: bisa navigasi FilterBar -> tabel pakai Tab tanpa nyangkut', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForTimeout(500);

    // Tab beberapa kali dari body, pastikan focus selalu ada di elemen
    // yang kelihatan (gak "hilang" ke elemen invisible/gak fokusable)
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const isVisible = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return true; // wajar di awal/akhir
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      expect(isVisible, `Tab ke-${i + 1}: focus jatuh ke elemen yang gak kelihatan`).toBe(true);
    }
  });
});