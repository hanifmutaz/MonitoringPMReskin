const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { lateItemsFromLineStatus, lateItemFromPartMetric, fillDailyOutput } = require('./lateLineService');

const THRESHOLDS = { monthlyCap: 7, weeklyTotalDays: 7 };

describe('lateItemsFromLineStatus', () => {
  const base = {
    status_monthly: 'OK', sisa_hari_monthly: 3, tgl_pm_monthly_terakhir: '2026-10-01', akumulasi_poin_monthly_raw: 4,
    status_weekly: 'OK', sisa_hari_weekly: 2, tgl_pm_weekly_terakhir: '2026-10-10', akumulasi_poin_weekly_raw: 5,
  };

  test('tidak ada yang OVERDUE -> kosong', () => {
    assert.deepEqual(lateItemsFromLineStatus(base, THRESHOLDS), []);
  });

  test('Monthly OVERDUE -> 1 item dengan evidence poin vs cap', () => {
    const items = lateItemsFromLineStatus(
      { ...base, status_monthly: 'OVERDUE', sisa_hari_monthly: -2.5, akumulasi_poin_monthly_raw: 9.5 },
      THRESHOLDS
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'PM_LINE_MONTHLY');
    assert.equal(items[0].late_by_days, 2.5);
    assert.equal(items[0].poin_raw, 9.5);
    assert.equal(items[0].poin_cap, 7);
    assert.equal(items[0].last_pm_date, '2026-10-01');
  });

  test('DANGER (jatuh tempo hari ini, sisa 0) bukan terlambat', () => {
    assert.deepEqual(lateItemsFromLineStatus({ ...base, status_weekly: 'DANGER', sisa_hari_weekly: 0 }, THRESHOLDS), []);
  });

  test('Monthly dan Weekly sama-sama OVERDUE -> 2 item', () => {
    const items = lateItemsFromLineStatus(
      { ...base, status_monthly: 'OVERDUE', sisa_hari_monthly: -1, status_weekly: 'OVERDUE', sisa_hari_weekly: -3 },
      THRESHOLDS
    );
    assert.deepEqual(items.map((i) => i.type), ['PM_LINE_MONTHLY', 'PM_LINE_WEEKLY']);
  });
});

describe('lateItemFromPartMetric', () => {
  const part = { part_name: 'Punch A', drawing_no: 'DWG-1', counter: 120000, target_shot: 100000, remaining_shot: -20000, usage_per_day: 5000, last_tgl_ganti: '2026-08-01' };

  test('counter melewati target -> terlambat, estimasi hari dari pemakaian/hari', () => {
    const item = lateItemFromPartMetric(part);
    assert.equal(item.over_shot, 20000);
    assert.equal(item.late_by_days, 4);
  });

  test('sisa shot tepat 0 -> belum terlambat', () => {
    assert.equal(lateItemFromPartMetric({ ...part, remaining_shot: 0 }), null);
  });

  test('tanpa pemakaian/hari -> terlambat tapi hari tidak terukur', () => {
    const item = lateItemFromPartMetric({ ...part, usage_per_day: 0 });
    assert.equal(item.late_by_days, null);
  });
});

describe('fillDailyOutput', () => {
  test('hari tanpa data diisi 0, urut lama -> baru, panjang sesuai', () => {
    const out = fillDailyOutput([{ tanggal: '2026-10-23', output: 500 }], '2026-10-24', 3);
    assert.deepEqual(out, [
      { tanggal: '2026-10-22', output: 0 },
      { tanggal: '2026-10-23', output: 500 },
      { tanggal: '2026-10-24', output: 0 },
    ]);
  });
});
