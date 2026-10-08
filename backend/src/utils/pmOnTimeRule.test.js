// src/utils/pmOnTimeRule.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isWithinPmCutoff, isToleranceApplicable } = require('./pmOnTimeRule');

describe('isWithinPmCutoff', () => {
  test('sebelum jam batas -> true', () => {
    assert.equal(isWithinPmCutoff('07:00', '16:00'), true);
    assert.equal(isWithinPmCutoff('15:59', '16:00'), true);
  });
  test('tepat di jam batas atau sesudahnya -> false', () => {
    assert.equal(isWithinPmCutoff('16:00', '16:00'), false);
    assert.equal(isWithinPmCutoff('23:30', '16:00'), false);
  });
  test("'00:00' / kosong / tidak valid = toleransi nonaktif", () => {
    assert.equal(isWithinPmCutoff('00:00', '00:00'), false);
    assert.equal(isWithinPmCutoff('05:00', '00:00'), false);
    assert.equal(isWithinPmCutoff('05:00', undefined), false);
    assert.equal(isWithinPmCutoff('05:00', ''), false);
    assert.equal(isWithinPmCutoff('05:00', '25:99'), false);
  });
});

describe('isToleranceApplicable', () => {
  const base = { cap: 30, withinCutoff: true };
  test('cap baru terlewati di hari terakhir (prev <= cap < raw) + sebelum jam batas -> berlaku', () => {
    assert.equal(isToleranceApplicable({ ...base, raw: 30.5, rawPrev: 29.5 }), true);
    assert.equal(isToleranceApplicable({ ...base, raw: 31, rawPrev: 30 }), true);
  });
  test('sesudah jam batas -> tidak berlaku', () => {
    assert.equal(isToleranceApplicable({ ...base, withinCutoff: false, raw: 30.5, rawPrev: 29.5 }), false);
  });
  test('sudah lewat cap SEBELUM hari terakhir (prev > cap) -> tidak berlaku (tetap telat)', () => {
    assert.equal(isToleranceApplicable({ ...base, raw: 31.5, rawPrev: 30.5 }), false);
  });
  test('belum lewat cap -> tidak perlu toleransi', () => {
    assert.equal(isToleranceApplicable({ ...base, raw: 30, rawPrev: 29 }), false);
    assert.equal(isToleranceApplicable({ ...base, raw: 12, rawPrev: 11 }), false);
  });
  test('data belum ada (null) -> aturan ketat, tidak berlaku', () => {
    assert.equal(isToleranceApplicable({ ...base, raw: 30.5, rawPrev: null }), false);
    assert.equal(isToleranceApplicable({ ...base, raw: null, rawPrev: 29 }), false);
  });
});
