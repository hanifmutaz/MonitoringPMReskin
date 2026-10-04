// src/jobs/backupJob.test.js
// Unit test isDue() - fungsi murni penentu "apakah backup otomatis dibuat sekarang".
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { isDue } = require('./backupJob');

dayjs.extend(utc);
dayjs.extend(timezone);

// Waktu dinyatakan dalam WIB (UTC+7) supaya kasusnya mudah dibaca.
const wib = (s) => dayjs.tz(s, 'Asia/Jakarta');
const cfg = (over = {}) => ({ time: '02:00', intervalDays: 1, ...over });

describe('backupJob.isDue', () => {
  test('belum masuk jam jadwal hari ini -> belum waktunya (walau belum pernah backup)', () => {
    assert.equal(isDue(cfg(), null, wib('2026-10-04 01:59')), false);
  });

  test('tepat di jam jadwal & belum pernah backup -> due', () => {
    assert.equal(isDue(cfg(), null, wib('2026-10-04 02:00')), true);
  });

  test('harian: backup kemarin jam 02:00 -> hari ini jam 02:00 due (selisih 23j59m tetap 1 hari kalender)', () => {
    assert.equal(isDue(cfg(), wib('2026-10-03 02:00:30'), wib('2026-10-04 02:00:00')), true);
  });

  test('harian: sudah backup hari ini -> tidak due lagi (mis. server restart sore hari)', () => {
    assert.equal(isDue(cfg(), wib('2026-10-04 02:00'), wib('2026-10-04 15:00')), false);
  });

  test('server mati di jam jadwal, hidup lagi siang -> backup yang terlewat dikejar', () => {
    assert.equal(isDue(cfg(), wib('2026-10-03 02:00'), wib('2026-10-04 11:30')), true);
  });

  test('mingguan (7 hari): hari ke-6 belum, hari ke-7 due', () => {
    const last = wib('2026-10-01 02:00');
    assert.equal(isDue(cfg({ intervalDays: 7 }), last, wib('2026-10-07 02:00')), false);
    assert.equal(isDue(cfg({ intervalDays: 7 }), last, wib('2026-10-08 02:00')), true);
  });

  test('interval melintasi pergantian bulan tidak patah', () => {
    // 28 Sep -> 5 Okt = 7 hari kalender
    assert.equal(isDue(cfg({ intervalDays: 7 }), wib('2026-09-28 02:00'), wib('2026-10-05 02:00')), true);
  });

  test('hari kalender dihitung di WIB, bukan UTC', () => {
    // 01:30 WIB tanggal 4 = 18:30 UTC tanggal 3. Backup terakhir 23:50 WIB tanggal 3.
    // Di WIB selisihnya 1 hari kalender (jadwal 00:00 -> sudah lewat).
    assert.equal(isDue(cfg({ time: '00:00' }), wib('2026-10-03 23:50'), wib('2026-10-04 01:30')), true);
  });
});
