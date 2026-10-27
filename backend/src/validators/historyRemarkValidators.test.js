// Remark/Keterangan WAJIB diisi di input PM baru, dan di edit history.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateHistory, validateUpdateHistory } = require('./pmPartHistoryValidator');
const { validateCreatePmLineHistory, validateUpdatePmLineHistory } = require('./pmLineHistoryValidator');

const validPart = {
  part_id: 1,
  tgl_ganti: '2020-01-01',
  counter_saat_diganti: 100,
  jenis_penggantian: 'TERJADWAL',
  pic_name: 'Budi',
  remark: 'Ganti punch',
};

const validLine = { line_id: 1, jenis_pm: 'WEEKLY', pic_name: 'Andi', keterangan: 'Cek rutin' };

describe('PM Part: remark wajib', () => {
  test('create tanpa remark / remark kosong ditolak', () => {
    const { remark, ...noRemark } = validPart;
    assert.match(validateCreateHistory(noRemark).errors.remark, /wajib diisi/);
    assert.match(validateCreateHistory({ ...validPart, remark: '   ' }).errors.remark, /wajib diisi/);
  });

  test('create dengan remark valid lolos', () => {
    assert.equal(validateCreateHistory(validPart).valid, true);
  });

  test('update: remark wajib, PIC tidak boleh dikosongkan', () => {
    assert.match(validateUpdateHistory({}).errors.remark, /wajib diisi/);
    assert.match(validateUpdateHistory({ remark: 'abc', pic_name: ' ' }).errors.pic_name, /wajib/);
    assert.equal(validateUpdateHistory({ remark: 'abc' }).valid, true);
  });
});

describe('PM Line: keterangan wajib', () => {
  test('create tanpa keterangan ditolak', () => {
    const { keterangan, ...noKet } = validLine;
    assert.match(validateCreatePmLineHistory(noKet).errors.keterangan, /Keterangan wajib diisi/);
  });

  test('create dengan keterangan valid lolos', () => {
    assert.equal(validateCreatePmLineHistory(validLine).valid, true);
  });

  test('update: keterangan wajib', () => {
    assert.match(validateUpdatePmLineHistory({ keterangan: '' }).errors.keterangan, /wajib diisi/);
    assert.equal(validateUpdatePmLineHistory({ keterangan: 'Cek oli' }).valid, true);
  });
});
