// src/services/pmPartHistoryService.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { determineOnTime } = require('./pmPartHistoryService');

describe('determineOnTime - Fitur Ketepatan PM Part', () => {
  test('BROKEN -> selalu dikecualikan (null), berapa pun posisi counter', () => {
    assert.equal(determineOnTime('BROKEN', 100, 10000), null);
    assert.equal(determineOnTime('BROKEN', 10000, 10000), null);
    assert.equal(determineOnTime('BROKEN', 15000, 10000), null);
  });

  test('TERJADWAL: diganti sebelum target shot -> tepat waktu', () => {
    assert.equal(determineOnTime('TERJADWAL', 9000, 10000), true);
  });

  test('TERJADWAL: diganti persis di target shot -> tepat waktu', () => {
    assert.equal(determineOnTime('TERJADWAL', 10000, 10000), true);
  });

  test('TERJADWAL: diganti setelah lewat target shot -> telat', () => {
    assert.equal(determineOnTime('TERJADWAL', 10500, 10000), false);
  });

  test('PM_EARLY: sama aturannya dengan TERJADWAL (bukan BROKEN)', () => {
    assert.equal(determineOnTime('PM_EARLY', 5000, 10000), true);
    assert.equal(determineOnTime('PM_EARLY', 10001, 10000), false);
  });
});
