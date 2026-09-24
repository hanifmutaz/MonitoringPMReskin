// src/utils/pmPointFormula.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeDailyPoints } = require('./pmPointFormula');

describe('computeDailyPoints - formula proporsional per jumlah_shift (fix 24 Sep 2026)', () => {
  test('Line 2-shift, jalan 2 shift (penuh) -> 1.00 poin', () => {
    assert.equal(computeDailyPoints(2, 2, 1), 1);
  });

  test('Line 2-shift, jalan cuma 1 shift -> 0.50 poin', () => {
    assert.equal(computeDailyPoints(1, 2, 1), 0.5);
  });

  test('Line 2-shift, tidak jalan sama sekali -> 0 poin', () => {
    assert.equal(computeDailyPoints(0, 2, 1), 0);
  });

  test('Line 3-shift, jalan 3 shift (penuh) -> 1.00 poin', () => {
    assert.equal(computeDailyPoints(3, 3, 1), 1);
  });

  test('Line 3-shift, jalan cuma 2 shift -> 0.67 poin', () => {
    assert.equal(Math.round(computeDailyPoints(2, 3, 1) * 100) / 100, 0.67);
  });

  test('Line 3-shift, jalan cuma 1 shift -> 0.33 poin', () => {
    assert.equal(Math.round(computeDailyPoints(1, 3, 1) * 100) / 100, 0.33);
  });

  test('Bug lama: Line 3-shift jalan penuh vs Line 2-shift jalan penuh TIDAK LAGI disamakan', () => {
    const line2ShiftFull = computeDailyPoints(2, 2, 1); // dulu: runCount>=2 -> 1 poin
    const line3ShiftPartial = computeDailyPoints(2, 3, 1); // dulu: runCount>=2 -> 1 poin JUGA (bug)
    assert.notEqual(line2ShiftFull, line3ShiftPartial);
    assert.equal(line2ShiftFull, 1);
    assert.ok(line3ShiftPartial < 1);
  });

  test('Data ConMas anomali (running > jumlah_shift) tetap di-cap max 1 poin/hari', () => {
    assert.equal(computeDailyPoints(4, 2, 1), 1);
  });

  test('Menghormati pm_monthly_point_full_run/pm_weekly_point_full_run custom (bukan hardcode 1)', () => {
    assert.equal(computeDailyPoints(2, 2, 1.5), 1.5);
    assert.equal(computeDailyPoints(1, 2, 1.5), 0.75);
  });

  test('jumlah_shift kosong/0 (data belum diisi) -> 0 poin, bukan Infinity/NaN', () => {
    assert.equal(computeDailyPoints(2, 0, 1), 0);
    assert.equal(computeDailyPoints(2, null, 1), 0);
    assert.equal(computeDailyPoints(2, undefined, 1), 0);
  });
});
