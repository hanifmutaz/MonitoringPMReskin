// src/validators/partValidator.counterAwal.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dateUtils = require('../utils/dateUtils');
const { validateCreatePart, validateUpdatePart } = require('./partValidator');

const base = { line_id: 1, jig_name: 'J1', drawing_no: 'D1', part_name: 'P1', target_shot: 1000000 };
const yesterday = () => dateUtils.addDaysToToday(-1);

describe('partValidator - counter_awal (migration 1700000026000)', () => {
  test('CREATE: Part baru boleh tanpa tgl_pasang_awal kalau Counter Awal + tanggalnya diisi', () => {
    const r = validateCreatePart({ ...base, counter_awal: 500000, counter_awal_tanggal: yesterday() });
    assert.equal(r.valid, true);
  });
  test('CREATE: counter_awal 0 adalah nilai sah', () => {
    const r = validateCreatePart({ ...base, counter_awal: 0, counter_awal_tanggal: yesterday() });
    assert.equal(r.valid, true);
  });
  test('CREATE: tanpa tgl_pasang_awal DAN tanpa counter_awal tetap ditolak', () => {
    const r = validateCreatePart({ ...base });
    assert.equal(r.valid, false);
    assert.match(r.errors.tgl_pasang_awal, /wajib/i);
  });
  test('harus berpasangan: angka tanpa tanggal ditolak', () => {
    const r = validateCreatePart({ ...base, tgl_pasang_awal: yesterday(), counter_awal: 100 });
    assert.ok(r.errors.counter_awal_tanggal);
  });
  test('harus berpasangan: tanggal tanpa angka ditolak', () => {
    const r = validateUpdatePart({ counter_awal_tanggal: yesterday() });
    assert.ok(r.errors.counter_awal);
  });
  test('counter_awal negatif / desimal / bukan angka ditolak', () => {
    for (const v of [-1, 1.5, 'abc']) {
      const r = validateUpdatePart({ counter_awal: v, counter_awal_tanggal: yesterday() });
      assert.ok(r.errors.counter_awal, `harus ditolak: ${v}`);
    }
  });
  test('tanggal counter awal masa depan / format salah ditolak', () => {
    assert.ok(validateUpdatePart({ counter_awal: 1, counter_awal_tanggal: dateUtils.addDaysToToday(2) }).errors.counter_awal_tanggal);
    assert.ok(validateUpdatePart({ counter_awal: 1, counter_awal_tanggal: '28/09/2026' }).errors.counter_awal_tanggal);
  });
  test('UPDATE: tidak diisi sama sekali tidak error; null berpasangan (hapus) boleh', () => {
    assert.equal(validateUpdatePart({ part_name: 'P baru' }).valid, true);
    assert.equal(validateUpdatePart({ counter_awal: null, counter_awal_tanggal: null }).valid, true);
  });
});
