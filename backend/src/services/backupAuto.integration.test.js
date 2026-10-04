// src/services/backupAuto.integration.test.js
//
// Integration test backup OTOMATIS / tersimpan di server: setting jadwal,
// "Jalankan Sekarang", daftar & unduh file, retensi, keamanan nama file.
// Butuh Postgres nyata (DATABASE_URL) + migration. Test yang memakai format
// .dump dilewati kalau pg_dump tidak terpasang; sisanya (xlsx) tetap jalan.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../../app');
const db = require('../config/db');
const env = require('../config/env');
const backupJob = require('../jobs/backupJob');

const PASSWORD = 'SuperAmanBanget123';
const RUN = Date.now();
const hasPgDump = spawnSync(env.backup.pgDumpPath, ['--version']).status === 0;
const KEYS = ['backup_auto_enabled', 'backup_auto_time', 'backup_auto_interval_days', 'backup_auto_format', 'backup_auto_keep'];

function binaryParser(res, cb) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

async function makeUserAndLogin(roleName) {
  const role = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
  const hash = await bcrypt.hash(PASSWORD, 10);
  const username = `test_bkauto_${RUN}_${roleName.toLowerCase().replace(/\W/g, '')}`;
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

describe('Backup otomatis (tersimpan di server)', () => {
  let admin;
  let operator;
  let tmpDir;
  const originalDir = env.backup.dir;
  const originalPgDump = env.backup.pgDumpPath;
  const originalSettings = {};

  const patch = (key, value) =>
    request(app).patch(`/api/v1/settings/${key}`).set('Cookie', admin.cookie).send({ value });
  const status = () => request(app).get('/api/v1/settings/backup/auto').set('Cookie', admin.cookie);
  const runNow = () => request(app).post('/api/v1/settings/backup/auto/run').set('Cookie', admin.cookie);

  before(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pm-bkauto-test-'));
    env.backup.dir = tmpDir; // folder backup khusus test, bukan folder asli

    const rows = await db.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [KEYS]);
    for (const r of rows.rows) originalSettings[r.key] = r.value;
    assert.equal(rows.rows.length, KEYS.length, 'migration 1700000030000 harus sudah jalan');

    admin = await makeUserAndLogin('Admin');
    const roles = await db.query(`SELECT name FROM roles WHERE name <> 'Admin' AND deleted_at IS NULL ORDER BY id LIMIT 1`);
    operator = await makeUserAndLogin(roles.rows[0].name);
  });

  after(async () => {
    backupJob.stop(); // cron yang dibuat PATCH backup_auto_enabled=true tidak boleh menahan proses
    env.backup.dir = originalDir;
    env.backup.pgDumpPath = originalPgDump;
    for (const [key, value] of Object.entries(originalSettings)) {
      await db.query('UPDATE app_settings SET value = $1 WHERE key = $2', [value, key]);
    }
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    await db.pool.end();
  });

  test('default migration: nonaktif, 02:00, tiap 1 hari, dump, simpan 7', () => {
    assert.equal(originalSettings.backup_auto_enabled, 'false');
    assert.equal(originalSettings.backup_auto_time, '02:00');
    assert.equal(originalSettings.backup_auto_interval_days, '1');
    assert.equal(originalSettings.backup_auto_format, 'dump');
    assert.equal(originalSettings.backup_auto_keep, '7');
  });

  test('endpoint backup tersimpan: tanpa login 401, non-Admin 403', async () => {
    for (const [method, url] of [
      ['get', '/api/v1/settings/backup/auto'],
      ['post', '/api/v1/settings/backup/auto/run'],
      ['get', '/api/v1/settings/backup/auto/files/pm-monitoring-auto-20260101-0200.dump'],
    ]) {
      assert.equal((await request(app)[method](url)).status, 401, `${url} tanpa login`);
      assert.equal((await request(app)[method](url).set('Cookie', operator.cookie)).status, 403, `${url} non-Admin`);
    }
  });

  test('validasi setting backup_auto_*: nilai salah -> 400, nilai benar -> 200', async () => {
    const bad = [
      ['backup_auto_time', '25:00'],
      ['backup_auto_time', '2:00'],
      ['backup_auto_time', 'pagi'],
      ['backup_auto_format', 'zip'],
      ['backup_auto_interval_days', 0],
      ['backup_auto_interval_days', 31],
      ['backup_auto_interval_days', 1.5],
      ['backup_auto_keep', 0],
      ['backup_auto_keep', 91],
    ];
    for (const [key, value] of bad) {
      const res = await patch(key, value);
      assert.equal(res.status, 400, `${key}=${value}`);
    }
    const good = [
      ['backup_auto_time', '23:59'],
      ['backup_auto_format', 'xlsx'],
      ['backup_auto_interval_days', 7],
      ['backup_auto_keep', 3],
    ];
    for (const [key, value] of good) {
      const res = await patch(key, value);
      assert.equal(res.status, 200, `${key}=${value}`);
    }
  });

  test('mengaktifkan backup otomatis lewat Settings memasang jadwal tanpa restart (dan mematikannya lagi)', async () => {
    assert.equal((await patch('backup_auto_enabled', true)).status, 200);
    assert.equal((await patch('backup_auto_enabled', false)).status, 200);
  });

  test('Jalankan Sekarang (xlsx): file tersimpan, muncul di daftar, bisa diunduh, tercatat audit', async () => {
    await patch('backup_auto_format', 'xlsx');
    await patch('backup_auto_keep', 5);

    const run = await runNow();
    assert.equal(run.status, 200, JSON.stringify(run.body));
    const { name, format, size } = run.body.data;
    assert.match(name, /^pm-monitoring-manual-\d{8}-\d{4}\.xlsx$/);
    assert.equal(format, 'xlsx');
    assert.ok(size > 500);
    assert.ok(fs.existsSync(path.join(tmpDir, name)), 'file ada di BACKUP_DIR');
    assert.ok(!fs.readdirSync(tmpDir).some((n) => n.endsWith('.partial')), 'tidak ada sisa .partial');

    const st = await status();
    assert.equal(st.status, 200);
    assert.equal(st.body.data.last_run.ok, true);
    assert.equal(st.body.data.last_run.name, name);
    assert.equal(st.body.data.files[0].name, name);
    assert.equal(st.body.data.files[0].trigger, 'manual');
    // path server tidak bocor ke client
    assert.ok(!JSON.stringify(st.body).includes(tmpDir));

    const dl = await request(app)
      .get(`/api/v1/settings/backup/auto/files/${name}`)
      .set('Cookie', admin.cookie)
      .buffer(true)
      .parse(binaryParser);
    assert.equal(dl.status, 200);
    assert.match(dl.headers['content-disposition'], new RegExp(`attachment; filename="${name}"`));
    assert.equal(dl.body.length, size);
    assert.equal(dl.body.subarray(0, 2).toString('latin1'), 'PK', 'xlsx = zip');

    const audit = await db.query(
      `SELECT action_detail FROM audit_log WHERE table_name = 'backup' AND user_id = $1 ORDER BY id DESC LIMIT 1`,
      [admin.id]
    );
    assert.match(audit.rows[0].action_detail, /Backup manual di server tersimpan/);
  });

  test('Jalankan Sekarang (dump): file PGDMP valid', { skip: !hasPgDump && 'pg_dump tidak terpasang' }, async () => {
    await patch('backup_auto_format', 'dump');
    const run = await runNow();
    assert.equal(run.status, 200, JSON.stringify(run.body));
    const bytes = fs.readFileSync(path.join(tmpDir, run.body.data.name));
    assert.equal(bytes.subarray(0, 5).toString('latin1'), 'PGDMP');
    // izin file: hanya pemilik (berisi hash password)
    assert.equal(fs.statSync(path.join(tmpDir, run.body.data.name)).mode & 0o077, 0, 'tidak bisa dibaca user lain');
  });

  test('retensi: file lama di luar jumlah "simpan" dihapus, file jenis lain & asing tidak disentuh', async () => {
    await patch('backup_auto_format', 'xlsx');
    await patch('backup_auto_keep', 2);
    // Mulai dari folder kosong: file hasil test sebelumnya (jenis manual) ikut dihitung retensi.
    for (const n of fs.readdirSync(tmpDir)) fs.rmSync(path.join(tmpDir, n), { force: true });
    for (const stamp of ['20250101-0100', '20250101-0200', '20250101-0300']) {
      fs.writeFileSync(path.join(tmpDir, `pm-monitoring-manual-${stamp}.dump`), 'x');
    }
    fs.writeFileSync(path.join(tmpDir, 'pm-monitoring-auto-20250101-0100.dump'), 'x'); // jenis 'auto': hitungan terpisah
    fs.writeFileSync(path.join(tmpDir, 'catatan-saya.txt'), 'jangan dihapus');

    const run = await runNow();
    assert.equal(run.status, 200);
    assert.equal(run.body.data.pruned >= 2, true);

    const left = fs.readdirSync(tmpDir);
    assert.ok(!left.includes('pm-monitoring-manual-20250101-0100.dump'));
    assert.ok(!left.includes('pm-monitoring-manual-20250101-0200.dump'));
    assert.ok(left.includes('pm-monitoring-manual-20250101-0300.dump'), 'yang terbaru kedua tetap ada');
    assert.ok(left.includes(run.body.data.name), 'file baru tetap ada');
    assert.ok(left.includes('pm-monitoring-auto-20250101-0100.dump'), 'jenis auto tidak ikut dipangkas');
    assert.ok(left.includes('catatan-saya.txt'), 'file asing tidak disentuh');
  });

  test('unduh: nama file di luar pola / path traversal -> 404, file tidak ada -> 404', async () => {
    const names = [
      '..%2F..%2Fetc%2Fpasswd',
      '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '.last-run.json',
      'catatan-saya.txt',
      'pm-monitoring-auto-20250101-0100.dump.partial',
      'pm-monitoring-auto-20990101-0100.dump', // sesuai pola tapi tidak ada
    ];
    for (const n of names) {
      const res = await request(app).get(`/api/v1/settings/backup/auto/files/${n}`).set('Cookie', admin.cookie);
      assert.equal(res.status, 404, n);
    }
  });

  test('gagal (pg_dump tidak ada): 424, status terakhir ok=false, tidak ada sisa .partial', async () => {
    await patch('backup_auto_format', 'dump');
    env.backup.pgDumpPath = '/tidak/ada/pg_dump';
    try {
      const run = await runNow();
      assert.equal(run.status, 424);
      assert.match(run.body.message, /pg_dump tidak ditemukan/);
      const st = await status();
      assert.equal(st.body.data.last_run.ok, false);
      assert.match(st.body.data.last_run.message, /pg_dump tidak ditemukan/);
      assert.ok(!fs.readdirSync(tmpDir).some((n) => n.endsWith('.partial')));
      const audit = await db.query(
        `SELECT action_detail FROM audit_log WHERE table_name = 'backup' AND user_id = $1 ORDER BY id DESC LIMIT 1`,
        [admin.id]
      );
      assert.match(audit.rows[0].action_detail, /GAGAL/);
    } finally {
      env.backup.pgDumpPath = originalPgDump;
    }
  });

  test('runIfDue: nonaktif -> tidak menjalankan apa pun', async () => {
    await patch('backup_auto_enabled', false);
    assert.deepEqual(await backupJob.runIfDue('test'), { ran: false, reason: 'disabled' });
  });

  test('runIfDue: aktif & belum pernah backup otomatis -> membuat file jenis auto', async () => {
    await patch('backup_auto_enabled', true);
    await patch('backup_auto_time', '00:00'); // jam jadwal pasti sudah lewat
    await patch('backup_auto_format', 'xlsx');
    await patch('backup_auto_interval_days', 1);
    backupJob.stop();

    const first = await backupJob.runIfDue('test');
    assert.deepEqual(first, { ran: true });
    assert.ok(fs.readdirSync(tmpDir).some((n) => /^pm-monitoring-auto-\d{8}-\d{4}\.xlsx$/.test(n)));

    // Sudah ada backup otomatis hari ini -> run kedua tidak membuat lagi
    assert.deepEqual(await backupJob.runIfDue('test'), { ran: false, reason: 'not-due' });
    await patch('backup_auto_enabled', false);
    backupJob.stop();
  });
});
