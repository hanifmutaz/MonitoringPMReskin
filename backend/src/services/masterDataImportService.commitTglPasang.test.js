// src/services/masterDataImportService.commitTglPasang.test.js
//
// Perilaku commitImport untuk Tanggal Pasang Awal Part yang SUDAH ada:
// default cuma ngisi yang kosong, overwrite hanya kalau dinyalakan eksplisit.
// DB di-mock (tanpa Postgres) - yang diuji logika keputusan update-nya.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/db');
const lineQueries = require('../sql/lineQueries');
const partQueries = require('../sql/partQueries');
const clMappingQueries = require('../sql/clMappingQueries');
const { commitImport } = require('./masterDataImportService');
const dateUtils = require('../utils/dateUtils');

let parts;
let updates;

beforeEach(() => {
  updates = [];
  parts = {
    DRW_KOSONG: { id: 10, part_name: 'P10', target_shot: 1000, tgl_pasang_awal: null },
    DRW_ADA: { id: 11, part_name: 'P11', target_shot: 2000, tgl_pasang_awal: '2026-01-01' },
  };
  db.getClient = async () => ({ query: async () => ({}), release() {} });
  lineQueries.findByName = async () => ({ id: 1 });
  partQueries.findByLineJigAndDrawing = async (l, j, d) => {
    const p = parts[d];
    return p ? { id: p.id, tgl_pasang_awal: p.tgl_pasang_awal } : null;
  };
  partQueries.findRawById = async (id) => ({ ...Object.values(parts).find((p) => p.id === id) });
  partQueries.update = async (id, data) => {
    const p = Object.values(parts).find((x) => x.id === id);
    Object.assign(p, data);
    updates.push({ id, data });
    return { ...p };
  };
  clMappingQueries.findByPartAndClNo = async () => ({ id: 1 });
});

const row = (drawing_no, tgl, extra = {}) => ({
  line_no: 'L-01', jig_name: 'J', cl_no: 'CL-1', include: true,
  drawing_no, part_name: parts[drawing_no].part_name, target_shot: parts[drawing_no].target_shot,
  tgl_pasang_awal: tgl, ...extra,
});

describe('commitImport - Tanggal Pasang Awal part yang sudah ada', () => {
  test('default: mengisi yang kosong, TIDAK menimpa yang sudah terisi', async () => {
    const r = await commitImport([row('DRW_KOSONG', '2026-03-05'), row('DRW_ADA', '2026-03-05')], 1);
    assert.equal(parts.DRW_KOSONG.tgl_pasang_awal, '2026-03-05');
    assert.equal(parts.DRW_ADA.tgl_pasang_awal, '2026-01-01');
    assert.equal(r.tgl_pasang_overwritten, 0);
    assert.equal(r.parts_updated, 1);
  });

  test('overwriteTglPasang=true: menimpa yang sudah terisi dan dihitung', async () => {
    const r = await commitImport([row('DRW_ADA', '2026-03-05')], 1, { overwriteTglPasang: true });
    assert.equal(parts.DRW_ADA.tgl_pasang_awal, '2026-03-05');
    assert.equal(r.tgl_pasang_overwritten, 1);
    assert.equal(r.parts_updated, 1);
  });

  test('overwrite aktif tapi tanggal sama: tidak ada update', async () => {
    const r = await commitImport([row('DRW_ADA', '2026-01-01')], 1, { overwriteTglPasang: true });
    assert.equal(updates.length, 0);
    assert.equal(r.tgl_pasang_overwritten, 0);
  });

  test('overwrite aktif tapi Excel kosong: tanggal lama tetap', async () => {
    await commitImport([row('DRW_ADA', null)], 1, { overwriteTglPasang: true });
    assert.equal(parts.DRW_ADA.tgl_pasang_awal, '2026-01-01');
  });

  test('overwrite dengan tanggal masa depan / ngawur: baris gagal, data lama aman', async () => {
    const future = dateUtils.addDaysToToday(3);
    const r1 = await commitImport([row('DRW_ADA', future)], 1, { overwriteTglPasang: true });
    assert.equal(r1.row_errors.length, 1);
    const r2 = await commitImport([row('DRW_ADA', '2026-02-31')], 1, { overwriteTglPasang: true });
    assert.equal(r2.row_errors.length, 1);
    assert.equal(parts.DRW_ADA.tgl_pasang_awal, '2026-01-01');
  });

  test('part_name/target_shot tetap ditimpa Excel seperti sebelumnya', async () => {
    await commitImport([row('DRW_ADA', null, { part_name: 'Nama Baru', target_shot: 9999 })], 1);
    assert.equal(parts.DRW_ADA.part_name, 'Nama Baru');
    assert.equal(parts.DRW_ADA.target_shot, 9999);
    assert.equal(parts.DRW_ADA.tgl_pasang_awal, '2026-01-01');
  });
});
