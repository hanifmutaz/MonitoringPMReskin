// src/validators/partValidator.tglPasang.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dateUtils = require('../utils/dateUtils');
const { validateCreatePart, validateUpdatePart } = require('./partValidator');

const base = { line_id: 1, jig_name: 'J1', drawing_no: 'D1', part_name: 'P1', target_shot: 1000 };

describe('partValidator - tgl_pasang_awal', () => {
  test('CREATE: wajib - kosong/undefined/null ditolak', () => {
    for (const v of [undefined, null, '']) {
      const r = validateCreatePart({ ...base, tgl_pasang_awal: v });
      assert.equal(r.valid, false);
      assert.match(r.errors.tgl_pasang_awal, /wajib/i);
    }
  });
  test('UPDATE: tetap opsional - tidak diisi tidak error', () => {
    const r = validateUpdatePart({ part_name: 'P baru' });
    assert.equal(r.errors.tgl_pasang_awal, undefined);
  });
  test('UPDATE: kalau diisi tetap divalidasi (format salah ditolak)', () => {
    assert.ok(validateUpdatePart({ tgl_pasang_awal: '05/03/2026' }).errors.tgl_pasang_awal);
  });
  test('hari ini (WIB) valid', () => {
    const r = validateCreatePart({ ...base, tgl_pasang_awal: dateUtils.todayString() });
    assert.equal(r.valid, true);
  });
  test('masa depan ditolak', () => {
    const r = validateCreatePart({ ...base, tgl_pasang_awal: dateUtils.addDaysToToday(2) });
    assert.ok(r.errors.tgl_pasang_awal);
  });
  test('format salah ditolak', () => {
    assert.ok(validateCreatePart({ ...base, tgl_pasang_awal: '05/03/2026' }).errors.tgl_pasang_awal);
  });
});
