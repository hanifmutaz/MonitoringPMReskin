// src/middlewares/auth.integration.test.js
//
// Integration test untuk alur Authentication & Authorization — dibuat
// untuk menutup TECHNICAL_DEBT.md #3 ("auth flow, controllers, middleware,
// validators — nol test"), sekaligus jadi bukti otomatis untuk skenario
// yang dijanjikan di SECURITY_REVIEW.md (Finding #4) dan ThreatModel.md.
//
// Butuh DATABASE_URL yang menunjuk ke Postgres nyata (bukan mock) — sesuai
// pola project ini (lihat pmPartService.test.js dkk yang juga query DB
// asli). Di CI, sediakan service Postgres + jalankan migration dulu
// (lihat TECHNICAL_DEBT.md #5 untuk rencana workflow CI).

const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../../app');
const db = require('../config/db');

const TEST_PASSWORD = 'SuperAmanBanget123';
// Suffix unik per run supaya tidak bentrok dengan UNIQUE(username), dan
// supaya test tidak perlu men-DELETE user test (yang sekarang RESTRICTed
// kalau sudah py jejak di login_audit_log/audit_log — lihat migration
// 1700000005000). User test dibiarkan menumpuk apa adanya, sama seperti
// baris log-nya — konsisten dengan prinsip "audit trail tidak dihapus".
const RUN_ID = Date.now();
const USERNAME_PREFIX = `test_auth_${RUN_ID}_`;

async function createTestUser({ username, roleName, isActive = true }) {
    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    const roleId = roleRes.rows[0].id;
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const res = await db.query(
        `INSERT INTO users (username, password_hash, role_id, full_name, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, hash, roleId, `Test ${roleName}`, isActive]
    );
    return res.rows[0].id;
}

async function loginAs(username) {
    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username, password: TEST_PASSWORD });
    const setCookie = res.headers['set-cookie'] || [];
    const cookie = setCookie.find((c) => c.startsWith('token='));
    return { res, cookie };
}

describe('Auth flow (integration, DB nyata)', () => {
    after(async () => {
        await db.pool.end();
    });

    test('Login sukses: 200, cookie httpOnly ter-set, token TIDAK ada di body (Finding #7)', async () => {
        const username = `${USERNAME_PREFIX}ok1`;
        await createTestUser({ username, roleName: 'Operator' });

        const { res, cookie } = await loginAs(username);

        assert.equal(res.status, 200);
        assert.ok(cookie, 'cookie token harus ter-set');
        assert.ok(cookie.includes('HttpOnly'), 'cookie harus HttpOnly');
        assert.equal(res.body.data.token, undefined, 'token tidak boleh ada di response body');
        assert.equal(res.body.data.user.username, username);
    });

    test('Login gagal (password salah / user tidak ada): pesan client identik, tidak bocorkan mana yang benar (anti user-enumeration)', async () => {
        const username = `${USERNAME_PREFIX}ok2`;
        await createTestUser({ username, roleName: 'Operator' });

        const wrongPassRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username, password: 'password-salah-total' });

        const noUserRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: `${USERNAME_PREFIX}tidak_ada`, password: 'apapun123456' });

        assert.equal(wrongPassRes.status, 400);
        assert.equal(noUserRes.status, 400);
        assert.equal(wrongPassRes.body.message, noUserRes.body.message);
    });

    test('Login gagal tetap tercatat detail internal di login_audit_log (Finding #2)', async () => {
        const username = `${USERNAME_PREFIX}ok3`;
        await createTestUser({ username, roleName: 'Operator' });

        await request(app).post('/api/v1/auth/login').send({ username, password: 'salah' });

        const logs = await db.query(
            'SELECT event_type FROM login_audit_log WHERE username_attempted = $1 ORDER BY id DESC LIMIT 1',
            [username]
        );
        assert.equal(logs.rows[0].event_type, 'LOGIN_FAILED_INVALID_PASSWORD');
    });

    test('Tanpa cookie: endpoint terproteksi menolak dengan 401', async () => {
        const res = await request(app).get('/api/v1/auth/me');
        assert.equal(res.status, 401);
    });

    test('JWT dimodifikasi (signature rusak): ditolak 401', async () => {
        const username = `${USERNAME_PREFIX}tamper`;
        await createTestUser({ username, roleName: 'Operator' });
        const { cookie } = await loginAs(username);

        const tampered = cookie.replace('token=', 'token=' + 'x').split(';')[0];

        const res = await request(app).get('/api/v1/auth/me').set('Cookie', tampered);
        assert.equal(res.status, 401);
    });

    test('Operator mengakses endpoint Admin-only: ditolak 403 (RBAC ditegakkan backend)', async () => {
        const username = `${USERNAME_PREFIX}operator1`;
        await createTestUser({ username, roleName: 'Operator' });
        const { cookie } = await loginAs(username);

        const res = await request(app).get('/api/v1/users').set('Cookie', cookie);
        assert.equal(res.status, 403);
    });

    test('Admin mengakses endpoint Admin-only: diizinkan 200', async () => {
        const username = `${USERNAME_PREFIX}admin1`;
        await createTestUser({ username, roleName: 'Admin' });
        const { cookie } = await loginAs(username);

        const res = await request(app).get('/api/v1/users').set('Cookie', cookie);
        assert.equal(res.status, 200);
    });

    test('User dinonaktifkan setelah login: request BERIKUTNYA langsung ditolak 401, tanpa menunggu token expired (Finding #4)', async () => {
        const username = `${USERNAME_PREFIX}revoke1`;
        const userId = await createTestUser({ username, roleName: 'Operator' });
        const { cookie } = await loginAs(username);

        // Pastikan token masih valid dulu (baseline)
        const before = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
        assert.equal(before.status, 200);

        // Admin menonaktifkan user ini langsung di DB (simulasi userManagementService)
        await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);

        // Token yang SAMA (belum expired) sekarang harus ditolak
        const afterRes = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
        assert.equal(afterRes.status, 401);
    });

    test('Role user diubah setelah login: request berikutnya langsung pakai role baru, bukan role lama dari JWT (Finding #4)', async () => {
        const username = `${USERNAME_PREFIX}rolechange1`;
        const userId = await createTestUser({ username, roleName: 'Operator' });
        const { cookie } = await loginAs(username);

        // Baseline: Operator ditolak endpoint Admin-only
        const before = await request(app).get('/api/v1/users').set('Cookie', cookie);
        assert.equal(before.status, 403);

        // Admin naikkan role user ini jadi Admin, TANPA user perlu login ulang
        const adminRoleRes = await db.query("SELECT id FROM roles WHERE name = 'Admin'");
        await db.query('UPDATE users SET role_id = $1 WHERE id = $2', [adminRoleRes.rows[0].id, userId]);

        // Token JWT yang sama, tapi sekarang harus diizinkan karena role sudah di-refresh dari DB
        const afterRes = await request(app).get('/api/v1/users').set('Cookie', cookie);
        assert.equal(afterRes.status, 200);
    });
});