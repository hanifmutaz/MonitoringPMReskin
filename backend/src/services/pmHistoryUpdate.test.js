// Unit test edit history PM Part / PM Line (updateHistory / updatePmLineHistory).
// db & query layer di-mock: test ini cek aturan bisnis (remark wajib, field yang
// boleh berubah, alasan telat, audit log, rollback) tanpa Postgres.

const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/db');
const pmPartHistoryQueries = require('../sql/pmPartHistoryQueries');
const pmLineHistoryQueries = require('../sql/pmLineHistoryQueries');
const pmPartHistoryService = require('./pmPartHistoryService');
const pmLineHistoryService = require('./pmLineHistoryService');

let client;
let sqlLog;

beforeEach(() => {
  sqlLog = [];
  client = {
    query: async (sql, params) => {
      sqlLog.push({ sql: String(sql).trim(), params });
      return { rows: [], rowCount: 1 };
    },
    release: () => {},
  };
  mock.method(db, 'getClient', async () => client);
});

afterEach(() => mock.restoreAll());

const auditInserts = () => sqlLog.filter((q) => q.sql.startsWith('INSERT INTO audit_log'));
const ran = (word) => sqlLog.some((q) => q.sql === word);

describe('updateHistory (PM Part)', () => {
  const before = { id: 7, remark: null, pic_name: 'Budi', on_time: true, alasan_telat: null, counter_saat_diganti: 1000 };

  test('isi remark pada baris lama yang kosong: tersimpan (trim) + audit UPDATE + commit', async () => {
    let saved;
    mock.method(pmPartHistoryQueries, 'findById', async () => before);
    mock.method(pmPartHistoryQueries, 'updateEditable', async (id, fields) => {
      saved = { id, fields };
      return true;
    });

    await pmPartHistoryService.updateHistory(7, { remark: '  Punch aus, diganti baru ' }, 42);

    assert.deepEqual(saved, { id: 7, fields: { remark: 'Punch aus, diganti baru', pic_name: 'Budi', alasan_telat: null } });
    assert.equal(auditInserts().length, 1);
    const [table, recordId, action] = auditInserts()[0].params;
    assert.equal(table, 'pm_part_history');
    assert.equal(recordId, 7);
    assert.equal(action, 'UPDATE');
    assert.ok(ran('COMMIT'));
  });

  test('PIC ikut berubah kalau dikirim', async () => {
    let saved;
    mock.method(pmPartHistoryQueries, 'findById', async () => before);
    mock.method(pmPartHistoryQueries, 'updateEditable', async (_id, fields) => {
      saved = fields;
      return true;
    });
    await pmPartHistoryService.updateHistory(7, { remark: 'Catatan baru', pic_name: ' Sari ' }, 1);
    assert.equal(saved.pic_name, 'Sari');
  });

  test('history tidak ditemukan / sudah dihapus -> 404 + rollback, tanpa update & audit', async () => {
    mock.method(pmPartHistoryQueries, 'findById', async () => null);
    const update = mock.method(pmPartHistoryQueries, 'updateEditable', async () => true);

    await assert.rejects(() => pmPartHistoryService.updateHistory(99, { remark: 'abc' }, 1), (err) => err.statusCode === 404);

    assert.equal(update.mock.callCount(), 0);
    assert.equal(auditInserts().length, 0);
    assert.ok(ran('ROLLBACK'));
  });

  test('baris telat: alasan lama dipertahankan kalau tidak dikirim, tidak bisa dikosongkan', async () => {
    const late = { ...before, on_time: false, alasan_telat: 'Menunggu sparepart' };
    let saved;
    mock.method(pmPartHistoryQueries, 'findById', async () => late);
    mock.method(pmPartHistoryQueries, 'updateEditable', async (_id, fields) => {
      saved = fields;
      return true;
    });

    await pmPartHistoryService.updateHistory(7, { remark: 'Catatan' }, 1);
    assert.equal(saved.alasan_telat, 'Menunggu sparepart');

    await assert.rejects(() => pmPartHistoryService.updateHistory(7, { remark: 'Catatan', alasan_telat: '' }, 1));
    assert.ok(ran('ROLLBACK'));
  });
});

describe('updatePmLineHistory (PM Line)', () => {
  const before = { id: 3, keterangan: null, pic_name: 'Andi', on_time: true, alasan_telat: null, jenis_pm: 'WEEKLY' };

  test('isi keterangan: hanya keterangan/PIC/alasan yang ditulis, audit ke pm_monthly_history', async () => {
    let saved;
    mock.method(pmLineHistoryQueries, 'findById', async () => before);
    mock.method(pmLineHistoryQueries, 'updateEditable', async (id, fields) => {
      saved = { id, fields };
      return true;
    });

    await pmLineHistoryService.updatePmLineHistory(3, { keterangan: ' Cek oli & baut ', on_time: false, jenis_pm: 'MONTHLY' }, 5);

    // Field di luar whitelist (on_time, jenis_pm) tidak ikut tersimpan.
    assert.deepEqual(saved, { id: 3, fields: { keterangan: 'Cek oli & baut', pic_name: 'Andi', alasan_telat: null } });
    assert.equal(auditInserts().length, 1);
    assert.equal(auditInserts()[0].params[0], 'pm_monthly_history');
    assert.ok(ran('COMMIT'));
  });

  test('tidak ditemukan -> 404 + rollback', async () => {
    mock.method(pmLineHistoryQueries, 'findById', async () => null);
    await assert.rejects(() => pmLineHistoryService.updatePmLineHistory(1, { keterangan: 'abc' }, 1), (err) => err.statusCode === 404);
    assert.ok(ran('ROLLBACK'));
  });
});
