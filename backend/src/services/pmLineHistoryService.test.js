// src/services/pmLineHistoryService.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { determineHelperUpdate, determineOnTime } = require('./pmLineHistoryService');

describe('determineHelperUpdate - Reset Rule MASTER DOCUMENT Bagian 2.D', () => {
  test('WEEKLY: update tgl_pm_weekly_terakhir + reset akumulasi_poin_weekly, tidak menyentuh Monthly', () => {
    const result = determineHelperUpdate('WEEKLY', '2026-07-11', null, true);
    assert.deepEqual(result, { tgl_pm_weekly_terakhir: '2026-07-11', akumulasi_poin_weekly: 0 });
  });

  test('MONTHLY + global default true + line override null -> ikut global (reset semua kolom Monthly+Weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', null, true);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      tgl_pm_weekly_terakhir: '2026-07-11',
      akumulasi_poin_weekly: 0,
    });
  });

  test('MONTHLY + global default false + line override null -> ikut global (reset kolom Monthly saja)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', null, false);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
    });
  });

  test('MONTHLY + global default true TAPI line override eksplisit false -> override menang (tidak reset weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', false, true);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
    });
  });

  test('MONTHLY + global default false TAPI line override eksplisit true -> override menang (tetap reset weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', true, false);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      tgl_pm_weekly_terakhir: '2026-07-11',
      akumulasi_poin_weekly: 0,
    });
  });

  test('akumulasi_poin_monthly SELALU direset ke 0 setiap kali PM Monthly baru dieksekusi', () => {
    const r1 = determineHelperUpdate('MONTHLY', '2026-01-01', null, true);
    const r2 = determineHelperUpdate('MONTHLY', '2026-01-01', false, false);
    assert.equal(r1.akumulasi_poin_monthly, 0);
    assert.equal(r2.akumulasi_poin_monthly, 0);
  });
});

const THRESHOLDS = { monthlyCap: 30, weeklyTotalDays: 7 };

describe('determineOnTime - Fitur Ketepatan PM Monthly/Weekly', () => {
  test('WEEKLY: belum pernah PM sama sekali -> tepat waktu (belum ada due date)', () => {
    const helperBefore = { tgl_pm_weekly_terakhir: null };
    assert.equal(determineOnTime('WEEKLY', '2026-07-11', helperBefore, THRESHOLDS), true);
  });

  test('WEEKLY: akumulasi poin belum mentok cap -> tepat waktu', () => {
    const helperBefore = { tgl_pm_weekly_terakhir: '2026-07-04', akumulasi_poin_weekly: 5 };
    assert.equal(determineOnTime('WEEKLY', '2026-07-11', helperBefore, THRESHOLDS), true); // 5 < 7
  });

  test('WEEKLY: akumulasi poin sudah mentok cap -> telat', () => {
    const helperBefore = { tgl_pm_weekly_terakhir: '2026-07-04', akumulasi_poin_weekly: 7 };
    assert.equal(determineOnTime('WEEKLY', '2026-07-12', helperBefore, THRESHOLDS), false); // 7 >= 7
  });

  test('WEEKLY: Line tidak pernah running sejak PM terakhir (poin 0) -> tetap tepat waktu walau banyak hari berlalu', () => {
    const helperBefore = { tgl_pm_weekly_terakhir: '2026-06-01', akumulasi_poin_weekly: 0 };
    assert.equal(determineOnTime('WEEKLY', '2026-07-12', helperBefore, THRESHOLDS), true);
  });

  test('MONTHLY: belum pernah PM sama sekali -> tepat waktu (belum ada due date)', () => {
    const helperBefore = { tgl_pm_monthly_terakhir: null, akumulasi_poin_monthly: 0 };
    assert.equal(determineOnTime('MONTHLY', '2026-07-11', helperBefore, THRESHOLDS), true);
  });

  test('MONTHLY: akumulasi poin belum mentok cap -> tepat waktu', () => {
    const helperBefore = { tgl_pm_monthly_terakhir: '2026-06-01', akumulasi_poin_monthly: 25 };
    assert.equal(determineOnTime('MONTHLY', '2026-07-11', helperBefore, THRESHOLDS), true);
  });

  test('MONTHLY: akumulasi poin sudah mentok cap -> telat (sudah due, belum di-PM)', () => {
    const helperBefore = { tgl_pm_monthly_terakhir: '2026-06-01', akumulasi_poin_monthly: 30 };
    assert.equal(determineOnTime('MONTHLY', '2026-07-11', helperBefore, THRESHOLDS), false);
  });
});