// src/services/backup.integration.test.js
//
// Integration test POST /api/v1/settings/backup. Butuh Postgres nyata
// (DATABASE_URL) + migration + `pg_dump` terpasang (versi >= server DB).
// Test dilewati (skip) otomatis kalau pg_dump tidak ada di mesin ini, supaya
// CI tanpa PostgreSQL client tidak merah palsu.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../../app');
const db = require('../config/db');
const env = require('../config/env');
const { buildPgDumpInvocation } = require('./backupService');

const PASSWORD = 'SuperAmanBanget123';
const RUN = Date.now();
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
  });

  after(async () => {
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
