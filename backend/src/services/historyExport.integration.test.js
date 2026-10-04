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
  });

  after(async () => {
    await db.query(`DELETE FROM inventory_stock_movements WHERE inventory_item_id = $1`, [ids.item]);
    await db.query(`DELETE FROM inventory_items WHERE id = $1`, [ids.item]);
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
});
