// src/utils/pmPointFormula.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeDailyPoints, FULL_DAY_RUN_COUNT } = require('./pmPointFormula');

describe('computeDailyPoints - aturan per tanggal (7 Nov 2026), tidak tergantung jumlah shift Line', () => {
  test('0 data di tanggal itu -> 0 poin', () => {
    assert.equal(computeDailyPoints(0, 1), 0);
  });

  test('1 data -> 0,5 hari', () => {
    assert.equal(computeDailyPoints(1, 1), 0.5);
  });

  test('2 data -> 1 hari penuh', () => {
    assert.equal(computeDailyPoints(2, 1), 1);
  });

  test('3 data (Line 3 shift jalan penuh) -> tetap 1 hari, tidak lebih', () => {
    assert.equal(computeDailyPoints(3, 1), 1);
  });

  test('2 data dan 3 data di tanggal yang sama nilainya SAMA (1 hari)', () => {
    assert.equal(computeDailyPoints(2, 1), computeDailyPoints(3, 1));
  });

  test('data ConMas anomali (jauh lebih banyak dari shift) tetap di-cap 1 hari', () => {
    assert.equal(computeDailyPoints(7, 1), 1);
  });

  test('menghormati pm_monthly_point_full_run/pm_weekly_point_full_run custom (bukan hardcode 1)', () => {
    assert.equal(computeDailyPoints(2, 1.5), 1.5);
    assert.equal(computeDailyPoints(1, 1.5), 0.75);
    assert.equal(computeDailyPoints(3, 1.5), 1.5);
  });

  test('input tidak valid (kosong/negatif/NaN) -> 0 poin, bukan NaN', () => {
    assert.equal(computeDailyPoints(null, 1), 0);
    assert.equal(computeDailyPoints(undefined, 1), 0);
    assert.equal(computeDailyPoints(-1, 1), 0);
    assert.equal(computeDailyPoints('abc', 1), 0);
  });

  test('ambang 1 hari penuh = 2 data', () => {
    assert.equal(FULL_DAY_RUN_COUNT, 2);
  });
});
