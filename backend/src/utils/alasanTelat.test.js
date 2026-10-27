const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAlasanTelat, resolveAlasanTelatOnEdit, validateAlasanTelatShape } = require('./alasanTelat');

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

describe('resolveAlasanTelatOnEdit', () => {
  test('baris tepat waktu / dikecualikan: alasan tersimpan tidak berubah', () => {
    assert.equal(resolveAlasanTelatOnEdit(true, null, 'diabaikan'), null);
    assert.equal(resolveAlasanTelatOnEdit(null, null, 'diabaikan'), null);
  });

  test('baris telat, alasan tidak dikirim: tetap alasan lama', () => {
    assert.equal(resolveAlasanTelatOnEdit(false, 'Mesin rusak', undefined), 'Mesin rusak');
  });

  test('baris telat, alasan baru valid: diganti (di-trim)', () => {
    assert.equal(resolveAlasanTelatOnEdit(false, 'Mesin rusak', '  Menunggu sparepart  '), 'Menunggu sparepart');
  });

  test('baris telat, alasan dikirim kosong/pendek: ditolak (tidak bisa dikosongkan)', () => {
    assert.throws(() => resolveAlasanTelatOnEdit(false, 'Mesin rusak', ''));
    assert.throws(() => resolveAlasanTelatOnEdit(false, 'Mesin rusak', 'abc'));
  });
});
