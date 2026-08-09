// src/utils/dateUtils.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const dateUtils = require('./dateUtils');

// Helper test HARUS pakai timezone WIB juga (bukan UTC/local sistem),
// karena dateUtils.js sengaja convert semua ke Asia/Jakarta (Timezone
// Rule §30). Membandingkan ke dayjs() polos (local/UTC sandbox) akan
// false-positive gagal kalau kebetulan jam sistem lewat tengah malam UTC
// tapi belum lewat tengah malam WIB, atau sebaliknya.
function wibNow() {
  return dayjs().tz('Asia/Jakarta');
}

describe('dateUtils - Timezone Rule (Development Rules §30)', () => {
  test('todayString() mengembalikan format YYYY-MM-DD', () => {
    assert.match(dateUtils.todayString(), /^\d{4}-\d{2}-\d{2}$/);
  });

  test('daysSince() menghitung selisih hari kalender dengan benar', () => {
    const tenDaysAgo = wibNow().subtract(10, 'day').format('YYYY-MM-DD');
    assert.equal(dateUtils.daysSince(tenDaysAgo), 10);
  });

  test('daysSince() untuk tanggal hari ini = 0', () => {
    assert.equal(dateUtils.daysSince(dateUtils.todayString()), 0);
  });

  test('daysSince(null) -> null (bukan error, bukan NaN)', () => {
    assert.equal(dateUtils.daysSince(null), null);
  });

  test('addDaysToToday() menambah hari dengan benar dan format konsisten', () => {
    const result = dateUtils.addDaysToToday(5);
    const expected = wibNow().add(5, 'day').format('YYYY-MM-DD');
    assert.equal(result, expected);
  });

  test('formatDate() tidak error untuk objek Date dari pg driver (DATE column)', () => {
    // Simulasi nilai yang biasa dikembalikan node-postgres untuk kolom DATE
    const pgDateValue = new Date('2026-07-11T00:00:00.000Z');
    assert.equal(dateUtils.formatDate(pgDateValue), '2026-07-11');
  });

  test('konsisten: today() service HARUS dalam Asia/Jakarta, bukan UTC/local server', () => {
    // Kalau ada yang sengaja/gak sengaja balikin dateUtils ke pakai
    // `new Date()` polos, test ini yang bakal nangkep duluan.
    assert.equal(dateUtils.todayString(), wibNow().format('YYYY-MM-DD'));
  });
});
