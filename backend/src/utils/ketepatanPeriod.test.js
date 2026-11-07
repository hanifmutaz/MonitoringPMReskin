// src/utils/ketepatanPeriod.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidMonthKey,
  addMonths,
  monthStart,
  monthEnd,
  yearOf,
  monthsOfYear,
  trendMonths,
  rangeOf,
  resolveMonthParam,
  isBeforeStartDate,
} = require('./ketepatanPeriod');

describe('ketepatanPeriod - key bulan', () => {
  test('isValidMonthKey: format YYYY-MM valid, selain itu tidak', () => {
    assert.equal(isValidMonthKey('2026-11'), true);
    assert.equal(isValidMonthKey('2026-1'), false);
    assert.equal(isValidMonthKey('2026-13'), false);
    assert.equal(isValidMonthKey('2026-00'), false);
    assert.equal(isValidMonthKey('1999-12'), false);
    assert.equal(isValidMonthKey('2026-11-01'), false);
    assert.equal(isValidMonthKey(undefined), false);
    assert.equal(isValidMonthKey(202611), false);
  });

  test('addMonths: lintas tahun ke belakang dan ke depan', () => {
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(addMonths('2026-03', -5), '2025-10');
    assert.equal(addMonths('2025-12', 1), '2026-01');
    assert.equal(addMonths('2026-11', 0), '2026-11');
    assert.equal(addMonths('2026-11', -12), '2025-11');
  });

  test('monthStart / monthEnd: termasuk Februari biasa, kabisat, dan bulan 30/31 hari', () => {
    assert.equal(monthStart('2026-11'), '2026-11-01');
    assert.equal(monthEnd('2026-11'), '2026-11-30');
    assert.equal(monthEnd('2026-10'), '2026-10-31');
    assert.equal(monthEnd('2026-02'), '2026-02-28');
    assert.equal(monthEnd('2028-02'), '2028-02-29');
    assert.equal(monthEnd('2026-12'), '2026-12-31');
  });

  test('yearOf & monthsOfYear: 12 bulan Jan-Des', () => {
    assert.equal(yearOf('2026-11'), 2026);
    const months = monthsOfYear(2026);
    assert.equal(months.length, 12);
    assert.equal(months[0], '2026-01');
    assert.equal(months[11], '2026-12');
  });

  test('trendMonths: 6 bulan lama -> baru berakhir di bulan terpilih (lintas tahun)', () => {
    assert.deepEqual(trendMonths('2026-11'), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    assert.deepEqual(trendMonths('2026-02'), ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    assert.equal(trendMonths('2026-02', 3).length, 3);
  });
});

describe('ketepatanPeriod - rentang & validasi', () => {
  test('rangeOf month = bulan itu; year = 1 Jan sampai AKHIR bulan terpilih (year-to-date)', () => {
    assert.deepEqual(rangeOf('month', '2026-10'), { from: '2026-10-01', to: '2026-10-31' });
    assert.deepEqual(rangeOf('year', '2026-10'), { from: '2026-01-01', to: '2026-10-31' });
    assert.deepEqual(rangeOf('year', '2026-03'), { from: '2026-01-01', to: '2026-03-31' });
    assert.deepEqual(rangeOf('year', '2025-12'), { from: '2025-01-01', to: '2025-12-31' });
    assert.deepEqual(rangeOf('anything-else', '2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  });

  test('resolveMonthParam: kosong = bulan sekarang', () => {
    assert.deepEqual(resolveMonthParam(undefined, '2026-11'), { ok: true, month: '2026-11' });
    assert.deepEqual(resolveMonthParam('', '2026-11'), { ok: true, month: '2026-11' });
  });

  test('resolveMonthParam: backdate diterima, bulan sekarang diterima', () => {
    assert.deepEqual(resolveMonthParam('2025-03', '2026-11'), { ok: true, month: '2025-03' });
    assert.deepEqual(resolveMonthParam('2026-11', '2026-11'), { ok: true, month: '2026-11' });
  });

  test('resolveMonthParam: format salah dan masa depan ditolak', () => {
    assert.equal(resolveMonthParam('nov-2026', '2026-11').ok, false);
    assert.equal(resolveMonthParam('2026-12', '2026-11').ok, false);
    assert.equal(resolveMonthParam('2027-01', '2026-11').ok, false);
  });

  test('isBeforeStartDate: hanya true kalau seluruh periode sebelum tanggal mulai', () => {
    assert.equal(isBeforeStartDate('2026-05-31', '2026-06-15'), true);
    assert.equal(isBeforeStartDate('2026-06-30', '2026-06-15'), false); // sebagian periode masih terhitung
    assert.equal(isBeforeStartDate('2026-05-31', ''), false);
    assert.equal(isBeforeStartDate('2026-05-31', null), false);
    assert.equal(isBeforeStartDate('2026-05-31', 'bukan-tanggal'), false);
  });
});
