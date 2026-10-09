// src/services/pmLineService.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { computeLineStatus, statusFromRemainingDays } = require('./pmLineService');

const THRESHOLDS = {
  monthlyCap: 30,
  monthlyDangerDays: 2,
  monthlyWarningDays: 5,
  weeklyTotalDays: 7,
  weeklyDangerDays: 2,
  weeklyWarningDays: 5,
};

// WAJIB pakai Asia/Jakarta - dateUtils.js (dipakai computeLineStatus) selalu
// hitung "hari ini" dalam WIB, bukan UTC/local sandbox (Timezone Rule §30).
function daysAgo(n) {
  return dayjs().tz('Asia/Jakarta').subtract(n, 'day').format('YYYY-MM-DD');
}

describe('statusFromRemainingDays - fungsi threshold generik', () => {
  test('DANGER ketika sisa hari <= dangerDays', () => {
    assert.equal(statusFromRemainingDays(2, 2, 5), 'DANGER');
    assert.equal(statusFromRemainingDays(0, 2, 5), 'DANGER');
    assert.equal(statusFromRemainingDays(-1, 2, 5), 'DANGER');
  });
  test('WARNING ketika sisa hari < warningDays (dan bukan DANGER)', () => {
    assert.equal(statusFromRemainingDays(3, 2, 5), 'WARNING');
    assert.equal(statusFromRemainingDays(4, 2, 5), 'WARNING');
  });
  test('OK selain itu', () => {
    assert.equal(statusFromRemainingDays(5, 2, 5), 'OK');
    assert.equal(statusFromRemainingDays(10, 2, 5), 'OK');
  });
  test('null (belum pernah PM) -> DANGER', () => {
    assert.equal(statusFromRemainingDays(null, 2, 5), 'DANGER');
  });
});

describe('computeLineStatus - PM Weekly (akumulasi poin, capped - sejak migration 1700000019000)', () => {
  test('Sisa Hari Weekly = pm_weekly_total_days (cap) - akumulasi_poin_weekly', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(0),
        akumulasi_poin_monthly: 0,
        tgl_pm_weekly_terakhir: daysAgo(3),
        akumulasi_poin_weekly: 3,
      },
      THRESHOLDS
    );
    // sisa = 7-3 = 4
    assert.equal(result.sisa_hari_weekly, 4);
    assert.equal(result.status_weekly, 'WARNING'); // 4 < 5 (warning) tapi > 2 (danger)
  });

  test('status DANGER ketika sisa hari weekly <= 2', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(0),
        akumulasi_poin_monthly: 0,
        tgl_pm_weekly_terakhir: daysAgo(6),
        akumulasi_poin_weekly: 6,
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_weekly, 1); // 7-6=1
    assert.equal(result.status_weekly, 'DANGER');
  });

  test('Line tidak running (poin tidak nambah) -> sisa hari TIDAK berkurang meski banyak hari berlalu', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(0),
        akumulasi_poin_monthly: 0,
        tgl_pm_weekly_terakhir: daysAgo(6), // 6 hari kalender berlalu...
        akumulasi_poin_weekly: 0, // ...tapi Line gak pernah jalan -> poin tetap 0
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_weekly, 7); // 7-0, BUKAN 7-6
    assert.equal(result.status_weekly, 'OK');
  });
});

describe('computeLineStatus - PM Monthly (akumulasi poin, capped)', () => {
  test('Sisa Hari Monthly = cap - akumulasi_poin_monthly', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(10),
        akumulasi_poin_monthly: 22,
        tgl_pm_weekly_terakhir: daysAgo(0),
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_monthly, 8); // 30-22
    assert.equal(result.status_monthly, 'OK'); // 8 bukan <=2 dan bukan <5 -> OK
  });

  test('status WARNING ketika sisa hari monthly < 5', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(26),
        akumulasi_poin_monthly: 26,
        tgl_pm_weekly_terakhir: daysAgo(0),
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_monthly, 4); // 30-26
    assert.equal(result.status_monthly, 'WARNING');
  });

  test('status DANGER ketika sisa hari monthly <= 2', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(28),
        akumulasi_poin_monthly: 28,
        tgl_pm_weekly_terakhir: daysAgo(0),
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_monthly, 2);
    assert.equal(result.status_monthly, 'DANGER');
  });

  test('belum pernah PM Monthly (tgl null) -> DANGER, sisa hari null', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: null,
        akumulasi_poin_monthly: 0,
        tgl_pm_weekly_terakhir: daysAgo(0),
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_monthly, null);
    assert.equal(result.status_monthly, 'DANGER');
  });
});
describe('computeLineStatus - Sisa Hari dari poin mentah (bisa negatif) + toleransi jam batas', () => {
  const T = { ...THRESHOLDS, cutoffTime: '16:00' };
  const row = (raw, prev, capped = 30) => ({
    line_id: 1,
    line_name: 'L1',
    tgl_pm_monthly_terakhir: daysAgo(31),
    akumulasi_poin_monthly: capped,
    akumulasi_poin_monthly_raw: raw,
    akumulasi_poin_monthly_raw_prev: prev,
    tgl_pm_weekly_terakhir: daysAgo(3),
    akumulasi_poin_weekly: 3,
  });

  test('poin mentah melewati cap -> Sisa Hari NEGATIF (telat), bukan mentok 0', () => {
    const r = computeLineStatus(row('31.5', '30.5'), T, '10:00');
    assert.equal(r.sisa_hari_monthly, -1.5);
    assert.equal(r.status_monthly, 'DANGER');
    assert.equal(r.toleransi_monthly, false);
  });

  test('tepat di cap (raw = 30) -> Sisa 0 (jatuh tempo hari ini), bukan telat', () => {
    const r = computeLineStatus(row('30.0', '29.0'), T, '10:00');
    assert.equal(r.sisa_hari_monthly, 0);
    assert.equal(r.toleransi_monthly, false);
  });

  test('lewat 0,5 di hari terakhir + sebelum jam batas -> tampil 0 + toleransi (selaras dengan penilaian PM)', () => {
    const r = computeLineStatus(row('30.5', '29.5'), T, '10:00');
    assert.equal(r.sisa_hari_monthly, 0);
    assert.equal(r.toleransi_monthly, true);
    assert.equal(r.toleransi_sampai, '16:00');
  });

  test('lewat 0,5 di hari terakhir + SESUDAH jam batas -> Telat 0,5 (negatif), toleransi hilang', () => {
    const r = computeLineStatus(row('30.5', '29.5'), T, '16:01');
    assert.equal(r.sisa_hari_monthly, -0.5);
    assert.equal(r.toleransi_monthly, false);
  });

  test('raw belum ada (NULL) -> fallback ke poin ter-cap seperti sebelumnya', () => {
    const r = computeLineStatus(row(null, null, 28), T, '10:00');
    assert.equal(r.sisa_hari_monthly, 2);
  });

  test('estimasi PM = hari ini + sisa (dibulatkan ke BAWAH); sisa < 1 hari/telat -> hari ini', () => {
    const today = daysAgo(0);
    assert.equal(computeLineStatus(row('31.5', '30.5'), T, '10:00').estimasi_pm_monthly, today);
    const plus3 = dayjs().tz('Asia/Jakarta').add(3, 'day').format('YYYY-MM-DD');
    assert.equal(computeLineStatus(row('27.0', '26.0', 27), T, '10:00').estimasi_pm_monthly, plus3);
    // sisa 0,5 (1 shift lagi dari cap) -> PM dimajukan ke hari ini
    assert.equal(computeLineStatus(row('29.5', '28.5', 29.5), T, '10:00').estimasi_pm_monthly, today);
    // sisa 1,5 -> besok (bukan lusa)
    const plus1 = dayjs().tz('Asia/Jakarta').add(1, 'day').format('YYYY-MM-DD');
    assert.equal(computeLineStatus(row('28.5', '27.5', 28.5), T, '10:00').estimasi_pm_monthly, plus1);
  });

  test('belum pernah PM -> sisa null, status DANGER, tanpa estimasi', () => {
    const r = computeLineStatus({ line_id: 1, line_name: 'L', tgl_pm_monthly_terakhir: null, tgl_pm_weekly_terakhir: null }, T, '10:00');
    assert.equal(r.sisa_hari_monthly, null);
    assert.equal(r.status_monthly, 'DANGER');
    assert.equal(r.estimasi_pm_monthly, null);
  });
});
