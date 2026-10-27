const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateCreateLineCleaning } = require('./lineCleaningValidator');

const ok = { line_id: 3, pic_name: 'Budi', keterangan: 'Dibersihkan dari debu, mold dilap oli' };

describe('validateCreateLineCleaning - keterangan wajib', () => {
  test('lengkap -> valid', () => {
    assert.equal(validateCreateLineCleaning(ok).valid, true);
  });

  test('keterangan kosong / spasi saja / tidak dikirim / null -> ditolak', () => {
    for (const keterangan of ['', '   ', undefined, null]) {
      const r = validateCreateLineCleaning({ ...ok, keterangan });
      assert.equal(r.valid, false);
      assert.equal(r.errors.keterangan, 'Keterangan wajib diisi');
    }
  });

  test('keterangan bukan teks -> ditolak', () => {
    assert.equal(validateCreateLineCleaning({ ...ok, keterangan: 123 }).errors.keterangan, 'Keterangan wajib diisi');
  });

  test('keterangan > 500 karakter -> ditolak', () => {
    const r = validateCreateLineCleaning({ ...ok, keterangan: 'x'.repeat(501) });
    assert.equal(r.errors.keterangan, 'Keterangan maksimal 500 karakter');
  });

  test('aturan lain tetap: PIC wajib, tanggal masa depan ditolak', () => {
    assert.equal(validateCreateLineCleaning({ ...ok, pic_name: ' ' }).errors.pic_name, 'PIC wajib diisi');
    assert.ok(validateCreateLineCleaning({ ...ok, tgl_cleaning: '2999-01-01' }).errors.tgl_cleaning);
  });
});
