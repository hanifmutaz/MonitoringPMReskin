const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAlasanTelat, validateAlasanTelatShape } = require('./alasanTelat');

describe('resolveAlasanTelat', () => {
  test('tepat waktu -> alasan diabaikan (null)', () => {
    assert.equal(resolveAlasanTelat(true, 'tidak dipakai'), null);
  });

  test('dikecualikan dari ketepatan (null) -> null', () => {
    assert.equal(resolveAlasanTelat(null, undefined), null);
  });

  test('telat tanpa alasan -> error validasi alasan_telat', () => {
    assert.throws(() => resolveAlasanTelat(false, undefined), (err) => {
      assert.ok(err.errors?.alasan_telat || err.details?.alasan_telat || /alasan/i.test(err.message + JSON.stringify(err)));
      return true;
    });
  });

  test('telat dengan alasan terlalu pendek -> error', () => {
    assert.throws(() => resolveAlasanTelat(false, ' ab '));
  });

  test('telat dengan alasan valid -> disimpan (trim)', () => {
    assert.equal(resolveAlasanTelat(false, '  Line running terus, tidak ada jeda  '), 'Line running terus, tidak ada jeda');
  });
});

describe('validateAlasanTelatShape', () => {
  test('kosong boleh', () => assert.equal(validateAlasanTelatShape(undefined), null));
  test('bukan string ditolak', () => assert.ok(validateAlasanTelatShape(123)));
  test('lebih dari 500 karakter ditolak', () => assert.ok(validateAlasanTelatShape('x'.repeat(501))));
});
