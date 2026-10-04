// src/services/historyExport.integration.test.js
//
// Integration test export history (.xlsx): PM Part, PM Monthly/Weekly, mutasi
// Inventory. Butuh Postgres nyata (DATABASE_URL) + migration, sama dengan
// auth.integration.test.js. Data seed pakai suffix unik per run & dibersihkan
// di akhir; user test dibiarkan (RESTRICT dari login_audit_log, lihat catatan
// di auth.integration.test.js).
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');

const app = require('../../app');
const db = require('../config/db');

const PASSWORD = 'SuperAmanBanget123';
const RUN = Date.now();
const USERNAME = `test_export_${RUN}`;
const LINE_A = `EXP-A-${RUN}`;
const LINE_B = `EXP-B-${RUN}`;
const SPN = `EXP-SPN-${RUN}`;
const SPN_B = `EXP-SPNB-${RUN}`;
const AUDIT_TABLE = `test_dr_${RUN}`;

const ids = {};
let cookie;

function binaryParser(res, cb) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

async function getXlsx(path, query = {}) {
  const res = await request(app).get(path).query(query).set('Cookie', cookie).buffer(true).parse(binaryParser);
  return res;
}

function sheetRows(res) {
  const wb = xlsx.read(res.body, { type: 'buffer' });
  return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
}

describe('Export history .xlsx', () => {
  before(async () => {
    const role = await db.query(`SELECT id FROM roles WHERE name = 'Admin'`);
    const hash = await bcrypt.hash(PASSWORD, 10);
    const u = await db.query(
      `INSERT INTO users (username, password_hash, role_id, full_name, is_active)
       VALUES ($1, $2, $3, 'Test Export Admin', TRUE) RETURNING id`,
      [USERNAME, hash, role.rows[0].id]
    );
    ids.user = u.rows[0].id;

    const login = await request(app).post('/api/v1/auth/login').send({ username: USERNAME, password: PASSWORD });
    cookie = (login.headers['set-cookie'] || []).find((c) => c.startsWith('token='));
    assert.ok(cookie, 'login harus berhasil');

    ids.lineA = (await db.query(`INSERT INTO lines (line_name) VALUES ($1) RETURNING id`, [LINE_A])).rows[0].id;
    ids.lineB = (await db.query(`INSERT INTO lines (line_name) VALUES ($1) RETURNING id`, [LINE_B])).rows[0].id;

    ids.partA = (
      await db.query(
        `INSERT INTO parts (line_id, jig_name, drawing_no, part_name, target_shot)
         VALUES ($1, 'JIG-1', 'IPDP-001', 'Punch =CMD()', 100000) RETURNING id`,
        [ids.lineA]
      )
    ).rows[0].id;
    ids.partB = (
      await db.query(
        `INSERT INTO parts (line_id, jig_name, drawing_no, part_name, target_shot)
         VALUES ($1, 'JIG-2', 'IPDP-002', 'Die', 50000) RETURNING id`,
        [ids.lineB]
      )
    ).rows[0].id;

    await db.query(
      `INSERT INTO pm_part_history (part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, remark, pic_name, on_time, user_id)
       VALUES ($1, '2026-07-07', 1, 90000, 'TERJADWAL', 'ok', 'Budi', TRUE, $3),
              ($2, '2026-07-08', 2, 60000, 'TERJADWAL', NULL, 'Sari', FALSE, $3)`,
      [ids.partA, ids.partB, ids.user]
    );
    await db.query(
      `INSERT INTO pm_monthly_history (line_id, tgl_input, jenis_pm, keterangan, pic_name, user_id, on_time)
       VALUES ($1, '2026-07-07', 'MONTHLY', 'cek rutin', 'Budi', $3, TRUE),
              ($2, '2026-07-09', 'WEEKLY', NULL, 'Sari', $3, NULL)`,
      [ids.lineA, ids.lineB, ids.user]
    );

    ids.item = (
      await db.query(
        `INSERT INTO inventory_items (spare_part_number, part_name) VALUES ($1, 'Export Item') RETURNING id`,
        [SPN]
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO inventory_stock_movements (inventory_item_id, movement_type, qty, note, user_id)
       VALUES ($1, 'STOCK_IN', 10, 'stok awal', $2), ($1, 'STOCK_OUT', 3, 'dipakai', $2)`,
      [ids.item, ids.user]
    );
    // Item terpisah (supaya tes lama yang menghitung baris item utama tidak terganggu)
    // dengan dua mutasi tepat di batas hari WIB: 23:59:59 WIB 10 Mar & 00:00:00 WIB 11 Mar 2026.
    ids.itemB = (
      await db.query(
        `INSERT INTO inventory_items (spare_part_number, part_name) VALUES ($1, 'Export Item B') RETURNING id`,
        [SPN_B]
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO inventory_stock_movements (inventory_item_id, movement_type, qty, note, user_id, created_at)
       VALUES ($1, 'STOCK_IN', 1, 'batas-10', $2, '2026-03-10 16:59:59+00'),
              ($1, 'STOCK_IN', 2, 'batas-11', $2, '2026-03-10 17:00:00+00'),
              ($1, 'STOCK_IN', 3, 'hari-ini',  $2, now())`,
      [ids.itemB, ids.user]
    );
    // Audit log bersifat append-only (tidak bisa dihapus), jadi pakai table_name unik per run.
    await db.query(
      `INSERT INTO audit_log (table_name, record_id, action, action_detail, user_id, created_at) VALUES
         ($1, 1, 'CREATE', 'a-10-akhir', $2, '2026-03-10 16:59:59+00'),
         ($1, 2, 'UPDATE', 'b-11-awal',  $2, '2026-03-10 17:00:00+00'),
         ($1, 3, 'DELETE', 'c-11-akhir', $2, '2026-03-11 16:59:59+00'),
         ($1, 4, 'CREATE', 'd-12-awal',  $2, '2026-03-11 17:00:00+00')`,
      [AUDIT_TABLE, ids.user]
    );
  });

  after(async () => {
    await db.query(`DELETE FROM inventory_stock_movements WHERE inventory_item_id = ANY($1)`, [[ids.item, ids.itemB]]);
    await db.query(`DELETE FROM inventory_items WHERE id = ANY($1)`, [[ids.item, ids.itemB]]);
    await db.query(`DELETE FROM pm_monthly_history WHERE line_id = ANY($1)`, [[ids.lineA, ids.lineB]]);
    await db.query(`DELETE FROM pm_part_history WHERE part_id = ANY($1)`, [[ids.partA, ids.partB]]);
    await db.query(`DELETE FROM parts WHERE id = ANY($1)`, [[ids.partA, ids.partB]]);
    await db.query(`DELETE FROM lines WHERE id = ANY($1)`, [[ids.lineA, ids.lineB]]);
    await db.pool.end();
  });

  test('tanpa login -> 401', async () => {
    const res = await request(app).get('/api/v1/pm-part-history/export');
    assert.equal(res.status, 401);
  });

  test('PM Part: file xlsx, header benar, filter line jalan, formula tidak dieksekusi', async () => {
    const res = await getXlsx('/api/v1/pm-part-history/export', { line_id: ids.lineA });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /spreadsheetml\.sheet/);
    assert.match(res.headers['content-disposition'], /attachment; filename="history-pm-part-\d{8}-\d{4}\.xlsx"/);

    const rows = sheetRows(res);
    assert.equal(rows[0][0], 'Tanggal Ganti');
    assert.equal(rows[0][3], 'Drawing No (IPDP)');
    assert.equal(rows.length, 2, 'header + 1 baris (hanya line A)');
    const [tgl, line, jig, ipdp, partName, shift, counter, jenis, pic, ketepatan] = rows[1];
    assert.equal(tgl, '2026-07-07');
    assert.equal(line, LINE_A);
    assert.equal(jig, 'JIG-1');
    assert.equal(ipdp, 'IPDP-001');
    assert.equal(partName, 'Punch =CMD()'); // tersimpan sebagai teks, bukan formula
    assert.equal(shift, 1);
    assert.equal(counter, 90000);
    assert.ok(jenis, 'label jenis terisi');
    assert.equal(pic, 'Budi');
    assert.equal(ketepatan, 'Tepat waktu');
  });

  test('PM Part: tanpa filter + filter date_from/date_to', async () => {
    const all = sheetRows(await getXlsx('/api/v1/pm-part-history/export'));
    assert.ok(all.length >= 3);
    const ranged = sheetRows(
      await getXlsx('/api/v1/pm-part-history/export', { line_id: ids.lineB, date_from: '2026-07-08', date_to: '2026-07-08' })
    );
    assert.equal(ranged.length, 2);
    assert.equal(ranged[1][9], 'Terlambat');
  });

  test('PM Line: Monthly/Weekly, label & ketepatan', async () => {
    const res = await getXlsx('/api/v1/pm-line-history/export', { line_id: ids.lineB });
    assert.equal(res.status, 200);
    const rows = sheetRows(res);
    assert.deepEqual(rows[0].slice(0, 5), ['Tanggal', 'Line', 'Jenis PM', 'PIC', 'Ketepatan']);
    assert.equal(rows.length, 2);
    assert.equal(rows[1][2], 'Weekly');
    assert.equal(rows[1][4], '-'); // on_time NULL

    const monthly = sheetRows(await getXlsx('/api/v1/pm-line-history/export', { line_id: ids.lineA, jenis: 'MONTHLY' }));
    assert.equal(monthly.length, 2);
    assert.equal(monthly[1][2], 'Monthly');
  });

  test('Inventory: mutasi, Stock Out negatif, filter item', async () => {
    const res = await getXlsx('/api/v1/inventory/movements/export', { item_id: ids.item });
    assert.equal(res.status, 200);
    const rows = sheetRows(res);
    assert.equal(rows.length, 3);
    const byType = Object.fromEntries(rows.slice(1).map((r) => [r[3], r[4]]));
    assert.equal(byType['Stock In'], 10);
    assert.equal(byType['Stock Out'], -3);
    assert.equal(rows[1][1], SPN);

    const out = sheetRows(await getXlsx('/api/v1/inventory/movements/export', { item_id: ids.item, movement_type: 'STOCK_OUT' }));
    assert.equal(out.length, 2);
  });

  test('filter tanpa hasil -> tetap file valid berisi header saja', async () => {
    const rows = sheetRows(await getXlsx('/api/v1/pm-part-history/export', { line_id: 999999999 }));
    assert.equal(rows.length, 1);
  });

  // --- filter tanggal -----------------------------------------------------

  test('tanggal tidak valid / terbalik -> 400 (bukan 500) di list & export', async () => {
    const paths = [
      '/api/v1/pm-part-history',
      '/api/v1/pm-part-history/export',
      '/api/v1/pm-line-history',
      '/api/v1/pm-line-history/export',
      '/api/v1/inventory/movements/all',
      '/api/v1/inventory/movements/export',
      '/api/v1/audit-log',
      '/api/v1/audit-log/export',
    ];
    for (const path of paths) {
      const bad = await request(app).get(path).query({ date_from: 'kemarin' }).set('Cookie', cookie);
      assert.equal(bad.status, 400, `${path} date_from salah`);
      assert.match(bad.body.errors.date_from, /YYYY-MM-DD/);
      const reversed = await request(app).get(path).query({ date_from: '2026-02-02', date_to: '2026-02-01' }).set('Cookie', cookie);
      assert.equal(reversed.status, 400, `${path} rentang terbalik`);
    }
  });

  test('PM Line history: date_from/date_to jalan di list (kolom DATE, batas inklusif)', async () => {
    const q = (extra) => request(app).get('/api/v1/pm-line-history').query({ line_id: ids.lineA, limit: 50, ...extra }).set('Cookie', cookie);
    assert.equal((await q({ date_from: '2026-07-07', date_to: '2026-07-07' })).body.data.total, 1);
    assert.equal((await q({ date_from: '2026-07-08' })).body.data.total, 0);
    assert.equal((await q({ date_to: '2026-07-06' })).body.data.total, 0);
  });

  test('Inventory: batas hari dihitung WIB, date_to inklusif seluruh hari (list & export)', async () => {
    const list = async (extra) =>
      (await request(app).get('/api/v1/inventory/movements/all').query({ item_id: ids.itemB, limit: 50, ...extra }).set('Cookie', cookie)).body.data;

    // 11 Mar WIB = 10 Mar 17:00 UTC s/d 11 Mar 16:59:59 UTC -> hanya 'batas-11'
    const day11 = await list({ date_from: '2026-03-11', date_to: '2026-03-11' });
    assert.equal(day11.total, 1);
    assert.equal(day11.items[0].note, 'batas-11');

    // 10 Mar WIB -> hanya 'batas-10' (00:00 WIB tgl 11 TIDAK ikut)
    const day10 = await list({ date_from: '2026-03-10', date_to: '2026-03-10' });
    assert.equal(day10.total, 1);
    assert.equal(day10.items[0].note, 'batas-10');

    // Rentang 10-11 Mar -> keduanya; mutasi 'hari-ini' tidak ikut
    assert.equal((await list({ date_from: '2026-03-10', date_to: '2026-03-11' })).total, 2);
    // Hanya date_from di masa depan jauh -> kosong
    assert.equal((await list({ date_from: '2999-01-01' })).total, 0);
    // Hanya date_to lampau -> 2 baris batas ('hari-ini' tidak ikut)
    assert.equal((await list({ date_to: '2026-03-11' })).total, 2);

    const rows = sheetRows(
      await getXlsx('/api/v1/inventory/movements/export', { item_id: ids.itemB, date_from: '2026-03-11', date_to: '2026-03-11' })
    );
    assert.equal(rows.length, 2, 'header + 1 baris');
    assert.equal(rows[1][5], 'batas-11');
  });

  // --- export Audit Log ---------------------------------------------------

  test('Audit Log: filter tabel + tanggal WIB, kolom, tanpa JSON mentah', async () => {
    const res = await getXlsx('/api/v1/audit-log/export', { table_name: AUDIT_TABLE, date_from: '2026-03-11', date_to: '2026-03-11' });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /attachment; filename="audit-log-\d{8}-\d{4}\.xlsx"/);
    const rows = sheetRows(res);
    assert.deepEqual(rows[0], ['Waktu (WIB)', 'User', 'Username', 'Tabel', 'Record ID', 'Aksi', 'Keterangan']);
    assert.equal(rows.length, 3, 'header + 2 baris (b & c; a & d jatuh di luar hari 11 WIB)');
    // terbaru dulu
    assert.equal(rows[1][6], 'c-11-akhir');
    assert.equal(rows[1][0], '2026-03-11 23:59');
    assert.equal(rows[1][3], AUDIT_TABLE);
    assert.equal(rows[2][6], 'b-11-awal');
    assert.equal(rows[2][0], '2026-03-11 00:00');
    assert.equal(rows[2][1], 'Test Export Admin');

    // list (UI) memakai aturan batas yang sama dengan export
    const list = await request(app)
      .get('/api/v1/audit-log')
      .query({ table_name: AUDIT_TABLE, date_from: '2026-03-11', date_to: '2026-03-11' })
      .set('Cookie', cookie);
    assert.equal(list.body.data.total, 2);
  });

  test('Audit Log export: butuh permission auditlog.view (tanpa login 401)', async () => {
    const res = await request(app).get('/api/v1/audit-log/export');
    assert.equal(res.status, 401);
  });

  // --- export Monitoring PM Part -----------------------------------------

  test('Monitoring PM Part: header, filter line, formula tidak dieksekusi, bukan dibaca sebagai /:partId', async () => {
    const res = await getXlsx('/api/v1/pm-part/export', { line_id: ids.lineA });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /spreadsheetml\.sheet/);
    assert.match(res.headers['content-disposition'], /filename="monitoring-pm-part-\d{8}-\d{4}\.xlsx"/);
    const rows = sheetRows(res);
    assert.deepEqual(rows[0].slice(0, 6), ['Line', 'Jig', 'Drawing No (IPDP)', 'Part Name', 'Supplier Utama', 'Counter']);
    assert.equal(rows.length, 2);
    assert.equal(rows[1][0], LINE_A);
    assert.equal(rows[1][2], 'IPDP-001');
    assert.equal(rows[1][3], 'Punch =CMD()');
    assert.equal(rows[1][6], 100000); // Target Shot

    const bySearch = sheetRows(await getXlsx('/api/v1/pm-part/export', { line_id: ids.lineB, search: 'IPDP-002' }));
    assert.equal(bySearch.length, 2);
    const noMatch = sheetRows(await getXlsx('/api/v1/pm-part/export', { line_id: ids.lineB, search: 'tidak-ada-part-ini' }));
    assert.equal(noMatch.length, 1);
  });

  test('Monitoring PM Part export: baris sama dengan list untuk filter yang sama', async () => {
    const list = await request(app).get('/api/v1/pm-part').query({ line_id: ids.lineA, limit: 50 }).set('Cookie', cookie);
    const rows = sheetRows(await getXlsx('/api/v1/pm-part/export', { line_id: ids.lineA }));
    assert.equal(rows.length - 1, list.body.data.total);
  });
});
