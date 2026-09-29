// src/validators/partValidator.tglPasang.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dateUtils = require('../utils/dateUtils');
const { validateCreatePart } = require('./partValidator');

const base = { line_id: 1, jig_name: 'J1', drawing_no: 'D1', part_name: 'P1', target_shot: 1000 };

describe('partValidator - tgl_pasang_awal', () => {
  test('opsional: kosong/undefined tidak error', () => {
    assert.equal(validateCreatePart(base).errors.tgl_pasang_awal, undefined);
    assert.equal(validateCreatePart({ ...base, tgl_pasang_awal: '' }).errors.tgl_pasang_awal, undefined);
  });
  test('hari ini (WIB) valid', () => {
    const r = validateCreatePart({ ...base, tgl_pasang_awal: dateUtils.todayString() });
    assert.equal(r.errors.tgl_pasang_awal, undefined);
  });
  test('masa depan ditolak', () => {
    const r = validateCreatePart({ ...base, tgl_pasang_awal: dateUtils.addDaysToToday(2) });
    assert.ok(r.errors.tgl_pasang_awal);
  });
  test('format salah ditolak', () => {
    assert.ok(validateCreatePart({ ...base, tgl_pasang_awal: '05/03/2026' }).errors.tgl_pasang_awal);
  });
});
