const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeLookbackDays } = require('./accrualLookback');

describe('computeLookbackDays - rentang query akrual', () => {
  test('baseline lebih tua dari setting -> diperluas sampai baseline + 1', () => {
    assert.equal(computeLookbackDays(90, 296), 297);
  });
  test('baseline lebih baru dari setting -> pakai setting', () => {
    assert.equal(computeLookbackDays(90, 51), 90);
  });
  test('tanpa baseline -> pakai setting; setting kosong/tidak valid -> 90', () => {
    assert.equal(computeLookbackDays(60, null), 60);
    assert.equal(computeLookbackDays(undefined, undefined), 90);
    assert.equal(computeLookbackDays(0, 10), 90);
  });
});
