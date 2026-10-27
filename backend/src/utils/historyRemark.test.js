const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateRemark } = require('./historyRemark');

describe('validateRemark', () => {
  test('kosong / undefined / bukan string ditolak', () => {
    assert.match(validateRemark(undefined, 'Remark'), /wajib diisi/);
    assert.match(validateRemark(null, 'Remark'), /wajib diisi/);
    assert.match(validateRemark('', 'Remark'), /wajib diisi/);
    assert.match(validateRemark('   ', 'Remark'), /wajib diisi/);
    assert.match(validateRemark(123, 'Remark'), /wajib diisi/);
  });

  test('terlalu pendek ditolak, label ikut di pesan', () => {
    assert.equal(validateRemark('ok', 'Keterangan'), 'Keterangan wajib diisi (minimal 3 karakter)');
  });

  test('terlalu panjang ditolak', () => {
    assert.match(validateRemark('x'.repeat(501), 'Remark'), /maksimal 500/);
  });

  test('valid', () => {
    assert.equal(validateRemark('Ganti punch, kondisi aus', 'Remark'), null);
    assert.equal(validateRemark('  abc  ', 'Remark'), null);
  });
});
