// src/utils/pmAccrual.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeAccruedPoints, nextDateStr } = require('./pmAccrual');

const S1 = 'Shift 1 (2 Shift)';
const S2 = 'Shift 2 (2 Shift)';

/** Bangun Map tanggal -> {count, shifts} seperti hasil fetchDailyRunCounts. */
function runs(entries) {
  return new Map(Object.entries(entries).map(([date, shifts]) => [date, { count: shifts.length, shifts }]));
}

const S3 = 'Shift 3 (3 Shift)';

const base = { pointFullRun: 1, shiftCut: null };

describe('computeAccruedPoints - hari berjalan ikut dihitung (realtime)', () => {
  // Baseline 5 Okt, 6-10 Okt full (5 poin), 11 Okt cuma 1 shift (0.5), + hari ini.
  const history = {
    '2026-10-06': [S1, S2],
    '2026-10-07': [S1, S2],
    '2026-10-08': [S1, S2],
    '2026-10-09': [S1, S2],
    '2026-10-10': [S1, S2],
    '2026-10-11': [S1],
  };

  test('data shift hari ini BELUM masuk -> poin = sampai kemarin', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-10-05', todayStr: '2026-10-12', runCountsByDate: runs(history),
    });
    assert.equal(r.total, 5.5);
    assert.equal(r.totalPrev, 5.5);
  });

  test('BUG LAMA: data shift hari ini sudah masuk -> poin LANGSUNG nambah (bukan nunggu besok)', () => {
    const r = computeAccruedPoints({
      ...base,
      baselineStr: '2026-10-05',
      todayStr: '2026-10-12',
      runCountsByDate: runs({ ...history, '2026-10-12': [S1] }),
    });
    assert.equal(r.total, 6); // 5.5 + 0.5 dari Shift 1 hari ini
  });

  test('totalPrev = poin sampai KEMARIN saja (tanpa hari ini)', () => {
    const r = computeAccruedPoints({
      ...base,
      baselineStr: '2026-10-05',
      todayStr: '2026-10-12',
      runCountsByDate: runs({ ...history, '2026-10-12': [S1, S2] }),
    });
    assert.equal(r.total, 6.5);
    assert.equal(r.totalPrev, 5.5);
  });

  test('hasil tidak bergantung timezone proses (murni string tanggal)', () => {
    // Regresi: versi dayjs membandingkan instan waktu, hasilnya beda antara TZ server.
    const input = {
      ...base, baselineStr: '2026-10-05', todayStr: '2026-10-12', runCountsByDate: runs({ ...history, '2026-10-12': [S1] }),
    };
    const original = process.env.TZ;
    try {
      const results = ['UTC', 'Asia/Jakarta', 'America/Los_Angeles'].map((tz) => {
        process.env.TZ = tz;
        return computeAccruedPoints(input).total;
      });
      assert.deepEqual(results, [6, 6, 6]);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe('computeAccruedPoints - tanggal PM (baseline) sadar-shift', () => {
  const day = { '2026-10-12': [S1, S2] };

  test('cut kosong -> seluruh tanggal PM dibuang (perilaku lama)', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-10-12', todayStr: '2026-10-12', shiftCut: null, runCountsByDate: runs(day),
    });
    assert.equal(r.total, 0);
  });

  test('cut=1 -> hanya shift bernomor > 1 di tanggal PM yang dihitung', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-10-12', todayStr: '2026-10-12', shiftCut: 1, runCountsByDate: runs(day),
    });
    assert.equal(r.total, 0.5);
  });

  test('baseline di masa depan -> 0 poin, tidak error', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-10-20', todayStr: '2026-10-12', runCountsByDate: runs(day),
    });
    assert.deepEqual(r, { total: 0, totalPrev: 0 });
  });

  test('Line tidak ada data sama sekali -> 0 poin', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-10-05', todayStr: '2026-10-12', runCountsByDate: new Map(),
    });
    assert.deepEqual(r, { total: 0, totalPrev: 0 });
  });
});

describe('computeAccruedPoints - Line pindah 2 shift -> 3 shift (aturan per tanggal)', () => {
  // Baseline 1 Nov. 2-5 Nov masih 2 shift (2 data/hari), 6-9 Nov sudah 3 shift (3 data/hari).
  const history = {
    '2026-11-02': [S1, S2],
    '2026-11-03': [S1, S2],
    '2026-11-04': [S1, S2],
    '2026-11-05': [S1, S2],
    '2026-11-06': [S1, S2, S3],
    '2026-11-07': [S1, S2, S3],
    '2026-11-08': [S1, S2, S3],
    '2026-11-09': [S1, S2, S3],
  };

  test('hari 2 data dan hari 3 data sama-sama dihitung 1 hari -> 8 hari = 8 poin', () => {
    const r = computeAccruedPoints({
      ...base, baselineStr: '2026-11-01', todayStr: '2026-11-09', runCountsByDate: runs(history),
    });
    assert.equal(r.total, 8);
    assert.equal(r.totalPrev, 7);
  });

  test('REGRESI: hasil TIDAK berubah walau jumlahShift Line diubah 2 -> 3 di master (parameter diabaikan)', () => {
    const input = { ...base, baselineStr: '2026-11-01', todayStr: '2026-11-09', runCountsByDate: runs(history) };
    assert.equal(computeAccruedPoints({ ...input, jumlahShift: 2 }).total, computeAccruedPoints({ ...input, jumlahShift: 3 }).total);
  });

  test('hari yang cuma 1 data tetap 0,5 hari (Line 3 shift yang sedang jalan sebagian)', () => {
    const r = computeAccruedPoints({
      ...base,
      baselineStr: '2026-11-01',
      todayStr: '2026-11-04',
      runCountsByDate: runs({ '2026-11-02': [S1, S2, S3], '2026-11-03': [S1], '2026-11-04': [S1, S2] }),
    });
    assert.equal(r.total, 2.5); // 1 + 0,5 + 1
  });

  test('tanggal PM (baseline) di Line 3 shift: 2 shift tersisa setelah PM = 1 hari, 1 shift tersisa = 0,5 hari', () => {
    const day = { '2026-11-07': [S1, S2, S3] };
    const cut1 = computeAccruedPoints({
      ...base, baselineStr: '2026-11-07', todayStr: '2026-11-07', shiftCut: 1, runCountsByDate: runs(day),
    });
    const cut2 = computeAccruedPoints({
      ...base, baselineStr: '2026-11-07', todayStr: '2026-11-07', shiftCut: 2, runCountsByDate: runs(day),
    });
    assert.equal(cut1.total, 1); // shift 2 & 3 masih jalan setelah PM
    assert.equal(cut2.total, 0.5); // tinggal shift 3
  });
});

describe('nextDateStr', () => {
  test('rollover bulan, tahun, dan kabisat', () => {
    assert.equal(nextDateStr('2026-09-30'), '2026-10-01');
    assert.equal(nextDateStr('2026-12-31'), '2027-01-01');
    assert.equal(nextDateStr('2028-02-28'), '2028-02-29');
    assert.equal(nextDateStr('2026-02-28'), '2026-03-01');
  });
});
