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

describe('computeLineStatus - PM Weekly (murni kalender)', () => {
  test('Sisa Hari Weekly = pm_weekly_total_days - (hari ini - tgl terakhir)', () => {
    const result = computeLineStatus(
      {
        line_id: 1,
        line_name: 'L1',
        tgl_pm_monthly_terakhir: daysAgo(0),
        akumulasi_poin_monthly: 0,
        tgl_pm_weekly_terakhir: daysAgo(3),
      },
      THRESHOLDS
    );
    // total hari weekly = 3, sisa = 7-3 = 4
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
      },
      THRESHOLDS
    );
    assert.equal(result.sisa_hari_weekly, 1); // 7-6=1
    assert.equal(result.status_weekly, 'DANGER');
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
