const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { lateItemsFromLineStatus, lateItemFromPartMetric, fillDailyOutput, buildKetepatanLateEvents } = require('./lateLineService');

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

describe('buildKetepatanLateEvents', () => {
  const lineEv = (over = {}) => ({ jenis_pm: 'WEEKLY', tgl_input: '2026-10-12', pic_name: 'Budi', keterangan: 'catatan', alasan_telat: 'Line running terus', telat_hari: '2.5', ...over });
  const partEv = (over = {}) => ({ tgl_ganti: '2026-10-20', counter_saat_diganti: 105000, target_shot: 100000, pic_name: 'Sari', remark: null, alasan_telat: 'Part datang telat', part_name: 'Punch A', drawing_no: 'DWG-1', ...over });

  test('Monthly/Weekly: lama telat dari telat_hari (angka), label per jenis', () => {
    const [e] = buildKetepatanLateEvents([lineEv()], []);
    assert.equal(e.source, 'PM_LINE_WEEKLY');
    assert.equal(e.label, 'PM Weekly');
    assert.deepEqual(e.late, { unit: 'hari', value: 2.5 });
    assert.equal(e.alasan_telat, 'Line running terus');
    assert.equal(buildKetepatanLateEvents([lineEv({ jenis_pm: 'MONTHLY' })], [])[0].label, 'PM Monthly');
  });

  test('data lama tanpa telat_hari -> late null (UI tulis "tidak tercatat", bukan 0)', () => {
    assert.equal(buildKetepatanLateEvents([lineEv({ telat_hari: null })], [])[0].late, null);
  });

  test('Part: lama telat = counter - target (shot) + persen di atas target', () => {
    const [e] = buildKetepatanLateEvents([], [partEv()]);
    assert.equal(e.source, 'PM_PART');
    assert.equal(e.label, 'Punch A (DWG-1)');
    assert.deepEqual(e.late, { unit: 'shot', value: 5000, percent: 5 });
  });

  test('gabungan diurutkan tanggal terbaru dulu', () => {
    const rows = buildKetepatanLateEvents([lineEv({ tgl_input: '2026-10-05' })], [partEv({ tgl_ganti: '2026-10-20' }), partEv({ tgl_ganti: '2026-10-10' })]);
    assert.deepEqual(rows.map((r) => r.tanggal), ['2026-10-20', '2026-10-10', '2026-10-05']);
  });

  test('kosong aman', () => {
    assert.deepEqual(buildKetepatanLateEvents(), []);
  });
});
