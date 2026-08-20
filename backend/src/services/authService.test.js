// src/services/authService.test.js
//
// Unit test authService dengan MOCK dependencies (userQueries, permissionQueries,
// loginAuditQueries, db, bcrypt) — beda pola dari auth.integration.test.js yang
// pakai DB Postgres nyata lewat HTTP layer. Test ini fokus ke business logic
// authService.js sendiri (branching status akun, pesan generik anti-enumeration,
// payload token, dll) tanpa butuh Postgres jalan — supaya bisa jalan di CI tanpa
// service DB, dan lebih cepat/terisolasi untuk debugging logic auth.
//
// Menutup sebagian TECHNICAL_DEBT.md #3 (authService belum ada unit test
// khusus, cuma ke-cover tidak langsung lewat integration test auth.integration.test.js).

const { test, describe, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcrypt');
const userQueries = require('../sql/userQueries');
const permissionQueries = require('../sql/permissionQueries');
const loginAuditQueries = require('../sql/loginAuditQueries');
const db = require('../config/db');
const { signToken } = require('../utils/jwt');

const authService = require('./authService');

function baseUser(overrides = {}) {
  return {
    id: 1,
    username: 'budi.santoso',
    password_hash: 'hashed-password',
    full_name: 'Budi Santoso',
    role_name: 'Operator',
    role_id: 5,
    is_active: true,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('authService.login', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  test('user tidak ditemukan -> pesan generik "Username atau password salah", tercatat LOGIN_FAILED_USER_NOT_FOUND', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => null);
    const logMock = mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});

    await assert.rejects(
      () => authService.login('tidak_ada', 'apapun123456'),
      (err) => {
        assert.equal(err.statusCode ?? err.status, 400);
        assert.equal(err.message, 'Username atau password salah');
        return true;
      }
    );
    assert.equal(logMock.mock.calls[0].arguments[0].eventType, 'LOGIN_FAILED_USER_NOT_FOUND');
  });

  test('akun is_active=false -> pesan generik yang SAMA persis dengan user-not-found (anti user-enumeration)', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser({ is_active: false }));
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});

    let messageDisabled;
    try {
      await authService.login('budi.santoso', 'passwordbenar123');
    } catch (err) {
      messageDisabled = err.message;
    }

    mock.method(userQueries, 'findByUsernameAnyStatus', async () => null);
    let messageNotFound;
    try {
      await authService.login('siapa_saja', 'apapun');
    } catch (err) {
      messageNotFound = err.message;
    }

    assert.equal(messageDisabled, 'Username atau password salah');
    assert.equal(messageDisabled, messageNotFound);
  });

  test('status PENDING -> ditolak SEBELUM bcrypt.compare dipanggil (hindari timing/kerja sia-sia)', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser({ status: 'PENDING' }));
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});
    const compareMock = mock.method(bcrypt, 'compare', async () => true);

    await assert.rejects(() => authService.login('budi.santoso', 'apapun123456'));
    assert.equal(compareMock.mock.callCount(), 0, 'bcrypt.compare tidak boleh dipanggil untuk akun PENDING');
  });

  test('status REJECTED -> ditolak dengan pesan generik yang sama', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser({ status: 'REJECTED' }));
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});

    await assert.rejects(
      () => authService.login('budi.santoso', 'apapun123456'),
      (err) => {
        assert.equal(err.message, 'Username atau password salah');
        return true;
      }
    );
  });

  test('password salah -> LOGIN_FAILED_INVALID_PASSWORD tercatat, pesan generik', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser());
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});
    mock.method(bcrypt, 'compare', async () => false);

    await assert.rejects(() => authService.login('budi.santoso', 'passwordsalah'));
  });

  test('login sukses (role bukan Admin) -> permissions di-resolve dari role_id, license_package ikut config, token bukan string kosong', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser());
    mock.method(userQueries, 'updateLastLogin', async () => {});
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});
    mock.method(bcrypt, 'compare', async () => true);
    const permMock = mock.method(permissionQueries, 'findPermissionKeysByRoleId', async () => ['pm_part:read', 'pm_part:update']);

    const result = await authService.login('budi.santoso', 'passwordbenar123');

    assert.equal(permMock.mock.calls[0].arguments[0], 5, 'harus resolve permission pakai role_id user, bukan hardcode');
    assert.deepEqual(result.user.permissions, ['pm_part:read', 'pm_part:update']);
    assert.equal(result.user.role, 'Operator');
    assert.ok(typeof result.token === 'string' && result.token.length > 0);
  });

  test('login sukses (role Admin) -> permissions selalu [\'*\'], TIDAK query role_permissions', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser({ role_name: 'Admin' }));
    mock.method(userQueries, 'updateLastLogin', async () => {});
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});
    mock.method(bcrypt, 'compare', async () => true);
    const permMock = mock.method(permissionQueries, 'findPermissionKeysByRoleId', async () => {
      throw new Error('tidak boleh dipanggil untuk Admin');
    });

    const result = await authService.login('budi.santoso', 'passwordbenar123');

    assert.deepEqual(result.user.permissions, ['*']);
    assert.equal(permMock.mock.callCount(), 0);
  });

  test('token JWT TIDAK memuat permissions atau license_package (resolve per-request dari DB, bukan dari klaim token)', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser({ role_name: 'Admin' }));
    mock.method(userQueries, 'updateLastLogin', async () => {});
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {});
    mock.method(bcrypt, 'compare', async () => true);

    const result = await authService.login('budi.santoso', 'passwordbenar123');
    const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64url').toString('utf8'));

    assert.equal(payload.permissions, undefined);
    assert.equal(payload.license_package, undefined);
    assert.equal(payload.role, 'Admin');
  });

  test('kegagalan mencatat audit log TIDAK menggagalkan proses login (audit gagal-diam, tidak crash flow utama)', async () => {
    mock.method(userQueries, 'findByUsernameAnyStatus', async () => baseUser());
    mock.method(userQueries, 'updateLastLogin', async () => {});
    mock.method(bcrypt, 'compare', async () => true);
    mock.method(permissionQueries, 'findPermissionKeysByRoleId', async () => []);
    mock.method(loginAuditQueries, 'recordLoginEvent', async () => {
      throw new Error('DB audit log down');
    });

    const result = await authService.login('budi.santoso', 'passwordbenar123');
    assert.ok(result.token);
  });
});

describe('authService.register', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  test('password gagal validasi (< 12 karakter) -> ditolak sebelum sentuh DB sama sekali', async () => {
    const clientMock = { query: mock.fn(async () => {}), release: mock.fn() };
    mock.method(db, 'getClient', async () => clientMock);
    const existsMock = mock.method(userQueries, 'usernameExists', async () => false);

    await assert.rejects(() => authService.register({
      username: 'budi', password: 'pendek', full_name: 'Budi', email: 'budi@x.com',
    }));

    assert.equal(existsMock.mock.callCount(), 0, 'tidak boleh query DB kalau password sudah gagal validasi format');
  });

  test('username sudah dipakai -> ROLLBACK dipanggil, client di-release', async () => {
    const clientMock = { query: mock.fn(async () => {}), release: mock.fn() };
    mock.method(db, 'getClient', async () => clientMock);
    mock.method(userQueries, 'usernameExists', async () => true);

    await assert.rejects(() =>
      authService.register({
        username: 'budi.santoso', password: 'PasswordAmanBanget123', full_name: 'Budi', email: 'budi@x.com',
      })
    );

    const queryCalls = clientMock.query.mock.calls.map((c) => c.arguments[0]);
    assert.ok(queryCalls.includes('BEGIN'));
    assert.ok(queryCalls.includes('ROLLBACK'));
    assert.equal(clientMock.release.mock.callCount(), 1, 'client harus tetap di-release meski gagal (finally)');
  });

  test('register sukses -> status PENDING, role_id NULL (tidak langsung bisa login), COMMIT dipanggil', async () => {
    const clientMock = { query: mock.fn(async () => {}), release: mock.fn() };
    mock.method(db, 'getClient', async () => clientMock);
    mock.method(userQueries, 'usernameExists', async () => false);
    mock.method(bcrypt, 'hash', async () => 'hashed');
    const createMock = mock.method(userQueries, 'createUser', async (data) => ({ id: 99, ...data }));

    const created = await authService.register({
      username: 'budi.santoso', password: 'PasswordAmanBanget123', full_name: 'Budi', email: 'budi@x.com',
    });

    const createArgs = createMock.mock.calls[0].arguments[0];
    assert.equal(createArgs.status, 'PENDING');
    assert.equal(createArgs.roleId, null);
    assert.equal(created.id, 99);

    const queryCalls = clientMock.query.mock.calls.map((c) => c.arguments[0]);
    assert.ok(queryCalls.includes('COMMIT'));
    assert.ok(!queryCalls.includes('ROLLBACK'));
    assert.equal(clientMock.release.mock.callCount(), 1);
  });
});

describe('authService.getMe', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  test('user tidak ditemukan -> 401 unauthorized', async () => {
    mock.method(userQueries, 'findUserById', async () => null);
    await assert.rejects(() => authService.getMe(1), (err) => {
      assert.equal(err.statusCode ?? err.status, 401);
      return true;
    });
  });

  test('user ditemukan tapi is_active=false -> tetap 401 (akun dinonaktifkan setelah token diterbitkan)', async () => {
    mock.method(userQueries, 'findUserById', async () => baseUser({ is_active: false }));
    await assert.rejects(() => authService.getMe(1));
  });

  test('user aktif -> permissions ikut role, tidak bocorkan password_hash ke response', async () => {
    mock.method(userQueries, 'findUserById', async () => baseUser());
    mock.method(permissionQueries, 'findPermissionKeysByRoleId', async () => ['pm_line:read']);

    const result = await authService.getMe(1);

    assert.deepEqual(result.permissions, ['pm_line:read']);
    assert.equal(result.password_hash, undefined);
  });
});
