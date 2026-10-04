// src/utils/dateRange.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseDateRange, addTimestampRange, isValidDateString } = require('./dateRange');

describe('isValidDateString', () => {
  test('menerima tanggal kalender yang valid', () => {
    assert.equal(isValidDateString('2026-10-04'), true);
    assert.equal(isValidDateString('2028-02-29'), true); // kabisat
  });
  test('menolak format salah & tanggal yang tidak ada', () => {
    for (const v of ['2026-2-3', '2026/10/04', '04-10-2026', 'abc', '2026-02-30', '2027-02-29', '2026-13-01', '', null, undefined, 20261004]) {
      assert.equal(isValidDateString(v), false, String(v));
    }
  });
});

describe('parseDateRange', () => {
  test('kosong -> keduanya undefined', () => {
    assert.deepEqual(parseDateRange({}), { dateFrom: undefined, dateTo: undefined });
    assert.deepEqual(parseDateRange({ date_from: '', date_to: '' }), { dateFrom: undefined, dateTo: undefined });
    assert.deepEqual(parseDateRange(), { dateFrom: undefined, dateTo: undefined });
  });
  test('salah satu / keduanya diisi', () => {
    assert.deepEqual(parseDateRange({ date_from: '2026-01-01' }), { dateFrom: '2026-01-01', dateTo: undefined });
    assert.deepEqual(parseDateRange({ date_to: '2026-01-31' }), { dateFrom: undefined, dateTo: '2026-01-31' });
    assert.deepEqual(parseDateRange({ date_from: '2026-01-01', date_to: '2026-01-01' }), { dateFrom: '2026-01-01', dateTo: '2026-01-01' });
  });
  test('format salah -> 400 per field', () => {
    assert.throws(
      () => parseDateRange({ date_from: 'kemarin', date_to: '2026-02-30' }),
      (err) => err.statusCode === 400 && /YYYY-MM-DD/.test(err.errors.date_from) && /YYYY-MM-DD/.test(err.errors.date_to)
    );
  });
  test('date_from > date_to -> 400', () => {
    assert.throws(
      () => parseDateRange({ date_from: '2026-02-02', date_to: '2026-02-01' }),
      (err) => err.statusCode === 400 && /tidak boleh sebelum/.test(err.errors.date_to)
    );
  });
});

describe('addTimestampRange', () => {
  test('menambah kondisi & parameter berurutan setelah parameter yang sudah ada', () => {
    const conditions = ['x = $1'];
    const params = ['a'];
    addTimestampRange(conditions, params, 'm.created_at', '2026-03-11', '2026-03-12');
    assert.deepEqual(params, ['a', '2026-03-11', '2026-03-12']);
    assert.equal(conditions.length, 3);
    assert.match(conditions[1], /m\.created_at >= .*\$2.*Asia\/Jakarta/);
    assert.match(conditions[2], /m\.created_at < .*\$3.*\+ 1.*Asia\/Jakarta/);
  });
  test('tanpa tanggal -> tidak mengubah apa pun', () => {
    const conditions = [];
    const params = [];
    addTimestampRange(conditions, params, 'a.created_at', undefined, undefined);
    assert.deepEqual({ conditions, params }, { conditions: [], params: [] });
  });
});
