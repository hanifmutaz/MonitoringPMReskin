const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { clampFrom } = require('./ketepatanStart');

describe('clampFrom - mulai hitung ketepatan', () => {
  test('tanggal mulai SESUDAH awal periode -> dipakai tanggal mulai', () => {
    assert.equal(clampFrom('2026-01-01', '2026-10-01'), '2026-10-01');
    assert.equal(clampFrom('2026-10-01', '2026-10-15'), '2026-10-15');
  });
  test('tanggal mulai SEBELUM awal periode -> awal periode tetap', () => {
    assert.equal(clampFrom('2026-10-01', '2026-01-01'), '2026-10-01');
  });
  test('kosong / null / tidak valid -> nonaktif (awal periode)', () => {
    assert.equal(clampFrom('2026-01-01', ''), '2026-01-01');
    assert.equal(clampFrom('2026-01-01', null), '2026-01-01');
    assert.equal(clampFrom('2026-01-01', 'abc'), '2026-01-01');
  });
});
