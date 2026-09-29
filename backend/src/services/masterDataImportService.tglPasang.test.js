// src/services/masterDataImportService.tglPasang.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseExcelDateCell } = require('./masterDataImportService');

describe('parseExcelDateCell - kolom Tanggal Pasang Awal', () => {
  test('kosong -> null', () => {
    assert.equal(parseExcelDateCell(''), null);
    assert.equal(parseExcelDateCell(null), null);
    assert.equal(parseExcelDateCell(undefined), null);
  });
  test('serial number Excel -> YYYY-MM-DD (tanpa geser timezone)', () => {
    assert.equal(parseExcelDateCell(46023), '2026-01-01');
  });
  test('format ISO dan DD/MM/YYYY', () => {
    assert.equal(parseExcelDateCell('2026-03-05'), '2026-03-05');
    assert.equal(parseExcelDateCell('5/3/2026'), '2026-03-05');
    assert.equal(parseExcelDateCell('05-03-2026'), '2026-03-05');
  });
  test('tanggal kalender tidak ada -> null (bukan lolos)', () => {
    assert.equal(parseExcelDateCell('2026-02-31'), null);
    assert.equal(parseExcelDateCell('31/02/2026'), null);
  });
  test('format tidak dikenali -> null', () => {
    assert.equal(parseExcelDateCell('kemarin'), null);
  });
  test('teks DD-Mon-YYYY (Inggris/Indonesia) -> YYYY-MM-DD', () => {
    assert.equal(parseExcelDateCell('28-Sep-2026'), '2026-09-28');
    assert.equal(parseExcelDateCell('5 Agu 2026'), '2026-08-05');
    assert.equal(parseExcelDateCell('01-Okt-2026'), '2026-10-01');
    assert.equal(parseExcelDateCell('31-Feb-2026'), null);
    assert.equal(parseExcelDateCell('28-Xyz-2026'), null);
  });
  test('serial number tanggal 28-Sep-2026', () => {
    assert.equal(parseExcelDateCell(46293), '2026-09-28');
  });
});
