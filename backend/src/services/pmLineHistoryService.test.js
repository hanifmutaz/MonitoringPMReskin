// src/services/pmLineHistoryService.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { determineHelperUpdate, determineOnTime, resolveTglInput } = require('./pmLineHistoryService');

describe('determineHelperUpdate - Reset Rule MASTER DOCUMENT Bagian 2.D', () => {
  test('WEEKLY: update tgl_pm_weekly_terakhir + reset akumulasi_poin_weekly, tidak menyentuh Monthly', () => {
    const result = determineHelperUpdate('WEEKLY', '2026-07-11', null, true);
    assert.deepEqual(result, {
      tgl_pm_weekly_terakhir: '2026-07-11',
      akumulasi_poin_weekly: 0,
      akumulasi_poin_weekly_raw: 0,
      akumulasi_poin_weekly_raw_prev: 0,
    });
  });

  test('MONTHLY + global default true + line override null -> ikut global (reset semua kolom Monthly+Weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', null, true);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      akumulasi_poin_monthly_raw: 0,
      akumulasi_poin_monthly_raw_prev: 0,
      tgl_pm_weekly_terakhir: '2026-07-11',
      akumulasi_poin_weekly: 0,
      akumulasi_poin_weekly_raw: 0,
      akumulasi_poin_weekly_raw_prev: 0,
    });
  });

  test('MONTHLY + global default false + line override null -> ikut global (reset kolom Monthly saja)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', null, false);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      akumulasi_poin_monthly_raw: 0,
      akumulasi_poin_monthly_raw_prev: 0,
    });
  });

  test('MONTHLY + global default true TAPI line override eksplisit false -> override menang (tidak reset weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', false, true);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      akumulasi_poin_monthly_raw: 0,
      akumulasi_poin_monthly_raw_prev: 0,
    });
  });

  test('MONTHLY + global default false TAPI line override eksplisit true -> override menang (tetap reset weekly)', () => {
    const result = determineHelperUpdate('MONTHLY', '2026-07-11', true, false);
    assert.deepEqual(result, {
      tgl_pm_monthly_terakhir: '2026-07-11',
      akumulasi_poin_monthly: 0,
      akumulasi_poin_monthly_raw: 0,
      akumulasi_poin_monthly_raw_prev: 0,
      tgl_pm_weekly_terakhir: '2026-07-11',
      akumulasi_poin_weekly: 0,
      akumulasi_poin_weekly_raw: 0,
      akumulasi_poin_weekly_raw_prev: 0,
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

describe('determineOnTime - poin mentah (tanpa cap), fix "PM hari ini dihitung telat"', () => {
  test('WEEKLY: poin mentah == cap (jatuh tempo HARI INI) -> tetap tepat waktu', () => {
    const h = { tgl_pm_weekly_terakhir: '2026-07-04', akumulasi_poin_weekly: 7, akumulasi_poin_weekly_raw: 7 };
    assert.equal(determineOnTime('WEEKLY', '2026-07-11', h, THRESHOLDS), true);
  });

  test('WEEKLY: poin mentah > cap (sudah lewat jatuh tempo) -> telat', () => {
    const h = { tgl_pm_weekly_terakhir: '2026-07-04', akumulasi_poin_weekly: 7, akumulasi_poin_weekly_raw: 9 };
    assert.equal(determineOnTime('WEEKLY', '2026-07-13', h, THRESHOLDS), false);
  });

  test('MONTHLY: poin mentah == cap -> tepat waktu; > cap -> telat', () => {
    const base = { tgl_pm_monthly_terakhir: '2026-06-01', akumulasi_poin_monthly: 30 };
    assert.equal(determineOnTime('MONTHLY', '2026-07-11', { ...base, akumulasi_poin_monthly_raw: '30.0' }, THRESHOLDS), true);
    assert.equal(determineOnTime('MONTHLY', '2026-07-11', { ...base, akumulasi_poin_monthly_raw: '31.5' }, THRESHOLDS), false);
  });

  test('raw NULL (baris lama) -> fallback aturan lama (poin ter-cap < cap)', () => {
    const h = { tgl_pm_weekly_terakhir: '2026-07-04', akumulasi_poin_weekly: 7, akumulasi_poin_weekly_raw: null };
    assert.equal(determineOnTime('WEEKLY', '2026-07-11', h, THRESHOLDS), false);
  });
});

describe('resolveTglInput - tanggal ditentukan sistem', () => {
  const TODAY = '2026-10-05';
  test('sudah pernah PM -> selalu hari ini, tanggal dari client diabaikan (anti backdate)', () => {
    const h = { tgl_pm_monthly_terakhir: '2026-09-01', tgl_pm_weekly_terakhir: '2026-09-28' };
    assert.equal(resolveTglInput('MONTHLY', '2026-08-01', h, TODAY), TODAY);
    assert.equal(resolveTglInput('WEEKLY', '2026-08-01', h, TODAY), TODAY);
  });

  test('PM pertama (tgl terakhir kosong) -> tanggal dari client dipakai', () => {
    assert.equal(resolveTglInput('MONTHLY', '2026-09-10', { tgl_pm_monthly_terakhir: null }, TODAY), '2026-09-10');
  });

  test('PM pertama tanpa tanggal dari client -> hari ini', () => {
    assert.equal(resolveTglInput('WEEKLY', undefined, { tgl_pm_weekly_terakhir: null }, TODAY), TODAY);
  });

  test('pengecekan per jenis: Monthly sudah ada, Weekly masih kosong -> Weekly boleh manual', () => {
    const h = { tgl_pm_monthly_terakhir: '2026-09-01', tgl_pm_weekly_terakhir: null };
    assert.equal(resolveTglInput('WEEKLY', '2026-09-20', h, TODAY), '2026-09-20');
    assert.equal(resolveTglInput('MONTHLY', '2026-09-20', h, TODAY), TODAY);
  });
});

describe('determineOnTime - toleransi jam batas PM (pm_ontime_cutoff_time)', () => {
  const T = { monthlyCap: 30, weeklyTotalDays: 7, cutoffTime: '16:00' };
  const mk = (raw, prev) => ({
    tgl_pm_monthly_terakhir: '2026-06-01',
    akumulasi_poin_monthly: 30,
    akumulasi_poin_monthly_raw: raw,
    akumulasi_poin_monthly_raw_prev: prev,
  });

  test('kasus lapangan: sisa 0,5 lalu shift 1+2 jalan (raw 30,5) - PM jam 15:00 besoknya -> TEPAT WAKTU', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('30.5', '29.5'), T, '15:00'), true);
  });
  test('PM pagi sebelum running (07:00) -> tepat waktu', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('30.5', '29.5'), T, '07:00'), true);
  });
  test('PM setelah jam batas (16:30) -> TELAT', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('30.5', '29.5'), T, '16:30'), false);
  });
  test('sudah lewat cap sebelum hari terakhir (raw_prev > cap) -> TELAT walau sebelum jam batas', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('31.5', '30.5'), T, '10:00'), false);
  });
  test('jam batas 00:00 (nonaktif) -> aturan lama: raw > cap = telat', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('30.5', '29.5'), { ...T, cutoffTime: '00:00' }, '10:00'), false);
  });
  test('raw_prev belum terisi (NULL) -> aturan ketat', () => {
    assert.equal(determineOnTime('MONTHLY', '2026-07-10', mk('30.5', null), T, '10:00'), false);
  });
  test('Weekly punya toleransi yang sama (cap 7)', () => {
    const h = {
      tgl_pm_weekly_terakhir: '2026-07-01',
      akumulasi_poin_weekly: 7,
      akumulasi_poin_weekly_raw: '7.5',
      akumulasi_poin_weekly_raw_prev: '6.5',
    };
    assert.equal(determineOnTime('WEEKLY', '2026-07-10', h, T, '15:00'), true);
    assert.equal(determineOnTime('WEEKLY', '2026-07-10', h, T, '17:00'), false);
  });
});
