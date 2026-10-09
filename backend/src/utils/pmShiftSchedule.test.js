const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { shiftsStartedAt, parseShiftNumber, countEligibleRuns } = require('./pmShiftSchedule');

describe('shiftsStartedAt', () => {
  test('2-shift: PM 20:00 -> Shift 1 sudah lewat, Shift 2 belum mulai', () => {
    assert.equal(shiftsStartedAt(2, '20:00'), 1);
  });
  test('2-shift: sebelum 07:00 -> 0; sedang Shift 2 (23:00) -> 2', () => {
    assert.equal(shiftsStartedAt(2, '06:59'), 0);
    assert.equal(shiftsStartedAt(2, '23:00'), 2);
  });
  test('3-shift: PM 15:00 -> Shift 1 & 2 sudah mulai', () => {
    assert.equal(shiftsStartedAt(3, '15:00'), 2);
  });
});

describe('parseShiftNumber', () => {
  test('baca nomor dari label ConMas', () => {
    assert.equal(parseShiftNumber('Shift 2 (2 Shift)'), 2);
    assert.equal(parseShiftNumber('Shift 1 (3 Shift)'), 1);
    assert.equal(parseShiftNumber('lainnya'), null);
  });
});

describe('countEligibleRuns', () => {
  const base = { baselineStr: '2026-10-09', runCount: 2, shifts: ['Shift 1 (2 Shift)', 'Shift 2 (2 Shift)'] };
  test('PM 20:00 (cut=1): Shift 2 di tanggal PM yang sama IKUT dihitung', () => {
    assert.equal(countEligibleRuns({ ...base, dateStr: '2026-10-09', cut: 1 }), 1);
  });
  test('tanpa cut (null): seluruh tanggal PM dibuang seperti perilaku lama', () => {
    assert.equal(countEligibleRuns({ ...base, dateStr: '2026-10-09', cut: null }), 0);
  });
  test('tanggal setelah baseline: semua run; sebelum baseline: 0', () => {
    assert.equal(countEligibleRuns({ ...base, dateStr: '2026-10-10', cut: 1 }), 2);
    assert.equal(countEligibleRuns({ ...base, dateStr: '2026-10-08', cut: 1 }), 0);
  });
  test('PM sebelum Shift 1 mulai (cut=0): kedua shift hari itu dihitung', () => {
    assert.equal(countEligibleRuns({ ...base, dateStr: '2026-10-09', cut: 0 }), 2);
  });
});
