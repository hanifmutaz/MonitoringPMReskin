// src/services/backup.integration.test.js
//
// Integration test POST /api/v1/settings/backup. Butuh Postgres nyata
// (DATABASE_URL) + migration + `pg_dump` terpasang (versi >= server DB).
// Test dilewati (skip) otomatis kalau pg_dump tidak ada di mesin ini, supaya
// CI tanpa PostgreSQL client tidak merah palsu.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const xlsx = require('xlsx');
const { URL } = require('url');
const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../../app');
const db = require('../config/db');
const env = require('../config/env');
const { buildPgDumpInvocation } = require('./backupService');

const PASSWORD = 'SuperAmanBanget123';
const RUN = Date.now();
const LINE = `BKP-${RUN}`;
const hasPgDump = spawnSync(env.backup.pgDumpPath, ['--version']).status === 0;

function binaryParser(res, cb) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

async function makeUserAndLogin(roleName) {
  const role = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
  const hash = await bcrypt.hash(PASSWORD, 10);
  const username = `test_backup_${RUN}_${roleName.toLowerCase()}`;
  const u = await db.query(
    `INSERT INTO users (username, password_hash, role_id, full_name, is_active)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [username, hash, role.rows[0].id, `Test ${roleName}`]
  );
  const login = await request(app).post('/api/v1/auth/login').send({ username, password: PASSWORD });
  const cookie = (login.headers['set-cookie'] || []).find((c) => c.startsWith('token='));
  assert.ok(cookie, `login ${roleName} harus berhasil`);
  return { id: u.rows[0].id, cookie };
}

describe('Backup database', () => {
  let admin;
  let operator;

  before(async () => {
    admin = await makeUserAndLogin('Admin');
    const roles = await db.query(`SELECT name FROM roles WHERE name <> 'Admin' AND deleted_at IS NULL ORDER BY id LIMIT 1`);
    operator = await makeUserAndLogin(roles.rows[0].name);
    await db.query(`INSERT INTO lines (line_name) VALUES ($1)`, [LINE]);
  });

  after(async () => {
    await db.query(`DELETE FROM lines WHERE line_name = $1`, [LINE]);
    await db.pool.end();
  });

  test('buildPgDumpInvocation: password lewat env, BUKAN argv', () => {
    const { args, env: childEnv } = buildPgDumpInvocation('postgresql://pm_app:p%40ss%2Fw@db.local:5433/pm_monitoring', '/tmp/x.dump');
    assert.ok(!args.join(' ').includes('p@ss'), 'password tidak boleh ada di argumen');
    assert.equal(childEnv.PGPASSWORD, 'p@ss/w');
    assert.deepEqual(args.slice(-2), ['--dbname', 'pm_monitoring']);
    assert.ok(args.includes('db.local') && args.includes('5433') && args.includes('pm_app'));
  });

  test('tanpa login -> 401', async () => {
    const res = await request(app).post('/api/v1/settings/backup');
    assert.equal(res.status, 401);
  });

  test('role non-Admin -> 403', async () => {
    const res = await request(app).post('/api/v1/settings/backup').set('Cookie', operator.cookie);
    assert.equal(res.status, 403);
  });

  test('Admin: dapat file dump valid (header PGDMP), tercatat di audit log', { skip: !hasPgDump && 'pg_dump tidak terpasang' }, async () => {
    const res = await request(app).post('/api/v1/settings/backup').set('Cookie', admin.cookie).buffer(true).parse(binaryParser);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /attachment; filename="pm-monitoring-backup-\d{8}-\d{4}\.dump"/);
    assert.equal(Number(res.headers['content-length']), res.body.length);
    assert.equal(res.body.subarray(0, 5).toString('latin1'), 'PGDMP', 'format custom pg_dump');
    assert.ok(res.body.length > 1000);

    const audit = await db.query(
      `SELECT action, action_detail FROM audit_log WHERE table_name = 'backup' AND user_id = $1 ORDER BY id DESC LIMIT 1`,
      [admin.id]
    );
    assert.equal(audit.rows[0].action, 'CREATE');
    assert.match(audit.rows[0].action_detail, /Backup database diunduh/);
  });

  const backup = (cookie, format) =>
    request(app)
      .post('/api/v1/settings/backup')
      .query(format ? { format } : {})
      .set('Cookie', cookie)
      .buffer(true)
      .parse(binaryParser);

  test('format tidak dikenal -> 400', async () => {
    const res = await request(app).post('/api/v1/settings/backup').query({ format: 'zip' }).set('Cookie', admin.cookie);
    assert.equal(res.status, 400);
    assert.match(res.body.errors.format, /dump, sql, xlsx/);
  });

  test('role non-Admin ditolak untuk SEMUA format', async () => {
    for (const f of ['dump', 'sql', 'xlsx']) {
      const res = await request(app).post('/api/v1/settings/backup').query({ format: f }).set('Cookie', operator.cookie);
      assert.equal(res.status, 403, f);
    }
  });

  test('sql: teks pg_dump, bisa di-restore ke DB kosong dengan psql', { skip: !hasPgDump && 'pg_dump tidak terpasang' }, async () => {
    const res = await backup(admin.cookie, 'sql');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /filename="pm-monitoring-backup-\d{8}-\d{4}\.sql"/);
    assert.match(res.headers['content-type'], /application\/sql/);
    const text = res.body.toString('utf8');
    assert.match(text, /PostgreSQL database dump/);
    assert.match(text, /CREATE TABLE public\.lines/);
    assert.ok(!/OWNER TO/.test(text), '--no-owner');

    // Restore sungguhan ke database baru.
    const url = new URL(env.databaseUrl);
    const conn = (db_) => ['-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username), '-d', db_];
    const penv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
    const target = `bkp_restore_${RUN}`;
    const admin_ = (sql) => spawnSync('psql', [...conn('postgres'), '-qc', sql], { env: penv });
    admin_(`DROP DATABASE IF EXISTS ${target}`);
    assert.equal(admin_(`CREATE DATABASE ${target}`).status, 0, 'buat DB tujuan');
    try {
      const restore = spawnSync('psql', [...conn(target), '-q', '-v', 'ON_ERROR_STOP=1'], { env: penv, input: res.body });
      assert.equal(restore.status, 0, `restore gagal: ${restore.stderr}`);
      const check = spawnSync('psql', [...conn(target), '-tAc', `SELECT count(*) FROM lines WHERE line_name='${LINE}'`], { env: penv });
      assert.equal(check.stdout.toString().trim(), '1', 'data hasil restore ada');
    } finally {
      admin_(`DROP DATABASE IF EXISTS ${target}`);
    }
  });

  test('xlsx: semua tabel jadi sheet, _INFO ada, password_hash TIDAK bocor', async () => {
    const res = await backup(admin.cookie, 'xlsx');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /filename="pm-monitoring-backup-\d{8}-\d{4}\.xlsx"/);
    assert.match(res.headers['content-type'], /spreadsheetml\.sheet/);

    const wb = xlsx.read(res.body, { type: 'buffer' });
    assert.equal(wb.SheetNames[0], '_INFO');
    for (const t of ['users', 'lines', 'roles', 'audit_log', 'app_settings']) assert.ok(wb.SheetNames.includes(t), `sheet ${t}`);
    assert.ok(!wb.SheetNames.includes('pgmigrations'));

    const users = xlsx.utils.sheet_to_json(wb.Sheets.users, { header: 1 });
    assert.ok(users[0].includes('username'));
    assert.ok(!users[0].includes('password_hash'), 'password_hash tidak boleh ada');
    assert.ok(!JSON.stringify(users).includes('$2b$'), 'tidak ada hash bcrypt di sel mana pun');

    const lines = xlsx.utils.sheet_to_json(wb.Sheets.lines);
    assert.ok(lines.some((r) => r.line_name === LINE), 'data Line seed ada');

    const info = xlsx.utils.sheet_to_json(wb.Sheets._INFO, { header: 1 });
    const linesInfo = info.find((r) => r[0] === 'lines');
    assert.ok(linesInfo[1] >= 1 && linesInfo[2] === linesInfo[1] && linesInfo[3] === 'lengkap');
    assert.ok(info.some((r) => String(r[1] || '').includes('BUKAN backup yang bisa di-restore')));
  });

  test('xlsx: melebihi batas baris -> dipotong (yang terbaru), ditandai di _INFO', async () => {
    const original = env.backup.excelMaxRowsPerTable;
    env.backup.excelMaxRowsPerTable = 3;
    try {
      const res = await backup(admin.cookie, 'xlsx');
      assert.equal(res.status, 200);
      const wb = xlsx.read(res.body, { type: 'buffer' });
      const users = xlsx.utils.sheet_to_json(wb.Sheets.users);
      assert.equal(users.length, 3);
      // yang dipertahankan = id terbesar (terbaru), terurut naik
      const ids = users.map((u) => u.id);
      assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
      const maxId = Number((await db.query('SELECT MAX(id) AS m FROM users')).rows[0].m);
      assert.equal(ids[ids.length - 1], maxId);
      const info = xlsx.utils.sheet_to_json(wb.Sheets._INFO, { header: 1 });
      assert.match(info.find((r) => r[0] === 'users')[3], /DIPOTONG/);
    } finally {
      env.backup.excelMaxRowsPerTable = original;
    }
  });

  test('audit log mencatat format yang dipilih', async () => {
    await backup(admin.cookie, 'xlsx');
    const a = await db.query(
      `SELECT action_detail FROM audit_log WHERE table_name='backup' AND user_id=$1 ORDER BY id DESC LIMIT 1`,
      [admin.id]
    );
    assert.match(a.rows[0].action_detail, /Excel \(\.xlsx\)/);
  });

  test('pg_dump tidak ada -> 424 dengan pesan jelas (bukan 5xx yang disamarkan)', async () => {
    const original = env.backup.pgDumpPath;
    env.backup.pgDumpPath = '/nonexistent/pg_dump';
    try {
      const res = await request(app).post('/api/v1/settings/backup').set('Cookie', admin.cookie);
      assert.equal(res.status, 424);
      assert.match(res.body.message, /pg_dump tidak ditemukan/);
    } finally {
      env.backup.pgDumpPath = original;
    }
  });

  test('setelah error, backup berikutnya tidak terkunci (running flag dilepas)', { skip: !hasPgDump && 'pg_dump tidak terpasang' }, async () => {
    const res = await request(app).post('/api/v1/settings/backup').set('Cookie', admin.cookie).buffer(true).parse(binaryParser);
    assert.equal(res.status, 200);
  });
});
