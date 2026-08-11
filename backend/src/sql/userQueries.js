// src/sql/userQueries.js
// Pure query functions. Tidak ada business logic di sini (Development Rules §7).

const db = require('../config/db');

/**
 * Ambil user by username TANPA filter is_active — dipakai khusus di login
 * flow supaya bisa membedakan "user tidak ada" vs "user ada tapi
 * dinonaktifkan" untuk keperluan login_audit_log (SECURITY_REVIEW.md
 * Finding #2). Pesan error ke CLIENT tetap generik di manapun — pembedaan
 * ini murni untuk log internal, tidak pernah dikirim ke response.
 */
async function findByUsernameAnyStatus(username) {
  const result = await db.query(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.is_active, u.status,
            r.id AS role_id, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Ambil user by username, join role_name, hanya user aktif.
 */
async function findActiveUserByUsername(username) {
  const result = await db.query(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.is_active,
            r.id AS role_id, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1 AND u.is_active = TRUE`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Ambil user by id, join role_name. Menyertakan `email`/`avatar_url`
 * (ditambahkan bareng fitur self-service profile - dipakai buat prefill
 * form "Profil Saya" di frontend, GET /auth/me).
 */
async function findUserById(id) {
  const result = await db.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.avatar_url, u.is_active, u.status,
            r.id AS role_id, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update last_login = now() saat login berhasil.
 */
async function updateLastLogin(id) {
  await db.query(`UPDATE users SET last_login = now(), updated_at = now() WHERE id = $1`, [id]);
}

/**
 * List user untuk User Management (Admin only). Join role_name, tanpa
 * password_hash sama sekali di SELECT (Development Rules - password
 * gak boleh bocor lewat endpoint manapun selain proses login internal).
 */
async function findAll({ role, isActive, status } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`r.name = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`u.is_active = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await runner.query(
    `SELECT u.id, u.username, u.full_name, u.email, r.id AS role_id, r.name AS role,
            u.is_active, u.status, u.last_login, u.created_at
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.username ASC`,
    params
  );
  return result.rows;
}

/**
 * Ambil user mentah (tanpa password_hash) buat kebutuhan detail/audit.
 */
async function findRawById(id, runner = db) {
  const result = await runner.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.avatar_url, u.role_id, u.is_active, u.status,
            u.approved_by, u.approved_at, u.last_login, u.created_at, u.updated_at
     FROM users u WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function usernameExists(username, runner = db) {
  const result = await runner.query(`SELECT id FROM users WHERE username = $1`, [username]);
  return !!result.rows[0];
}

async function roleExists(roleId, runner = db) {
  const result = await runner.query(`SELECT id FROM roles WHERE id = $1`, [roleId]);
  return !!result.rows[0];
}

/**
 * Dipakai murni untuk membangun pesan audit log yang mudah dibaca manusia
 * (SECURITY_REVIEW.md Finding #5), mis. "Role diubah: Operator -> Supervisor".
 * Bukan untuk keperluan otorisasi (itu selalu lewat requireRole/req.user.role).
 */
async function findRoleNameById(roleId, runner = db) {
  const result = await runner.query(`SELECT name FROM roles WHERE id = $1`, [roleId]);
  return result.rows[0] ? result.rows[0].name : null;
}

async function createUser({ username, passwordHash, fullName, roleId, email, status }, runner = db) {
  const result = await runner.query(
    `INSERT INTO users (username, password_hash, role_id, full_name, email, status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, username, full_name, email, role_id, status, is_active, created_at`,
    [username, passwordHash, roleId ?? null, fullName, email ?? null, status || 'APPROVED']
  );
  return result.rows[0];
}

/**
 * Approve user PENDING -> APPROVED, sekaligus assign role (Admin pilih
 * role-nya saat approve, karena user self-register belum py role_id).
 */
async function approveUser(id, roleId, approvedBy, runner = db) {
  const result = await runner.query(
    `UPDATE users SET status = 'APPROVED', role_id = $1, approved_by = $2, approved_at = now(), updated_at = now()
     WHERE id = $3
     RETURNING id, username, full_name, email, role_id, status, is_active, approved_by, approved_at, updated_at`,
    [roleId, approvedBy, id]
  );
  return result.rows[0] || null;
}

async function rejectUser(id, approvedBy, runner = db) {
  const result = await runner.query(
    `UPDATE users SET status = 'REJECTED', approved_by = $1, approved_at = now(), updated_at = now()
     WHERE id = $2
     RETURNING id, username, full_name, email, role_id, status, is_active, approved_by, approved_at, updated_at`,
    [approvedBy, id]
  );
  return result.rows[0] || null;
}

/**
 * Update user. `fields` boleh berisi password_hash (kalau ganti password),
 * tapi caller (Service) WAJIB strip password_hash sebelum kirim field ini
 * ke recordAudit() — lihat userManagementService.js.
 */
async function updateUser(id, fields, runner = db) {
  const setClauses = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  setClauses.push('updated_at = now()');
  params.push(id);

  const result = await runner.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${params.length}
     RETURNING id, username, full_name, email, role_id, is_active, updated_at`,
    params
  );
  return result.rows[0] || null;
}

/**
 * Ambil email user aktif berdasarkan daftar nama role. Dipakai
 * notificationService buat resolve penerima email notifikasi. User tanpa
 * email (NULL/kosong) otomatis TIDAK ikut - lihat filter di WHERE.
 */
async function findActiveEmailsByRoles(roleNames, runner = db) {
  if (!roleNames || roleNames.length === 0) return [];
  const result = await runner.query(
    `SELECT u.email
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = ANY($1) AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''`,
    [roleNames]
  );
  return result.rows.map((r) => r.email);
}

/**
 * Ambil password_hash by id - dipakai KHUSUS di alur ganti password sendiri
 * (PATCH /auth/me/password), buat verifikasi password lama sebelum diganti.
 * findUserById()/findRawById() SENGAJA gak nyertain password_hash (dipakai
 * luas di banyak tempat termasuk buat dibentuk jadi response ke client) -
 * query ini dipisah biar password_hash cuma ke-fetch pas bener-bener
 * dibutuhkan, konsisten sama prinsip di findByUsernameAnyStatus (Development
 * Rules - password gak boleh nyasar ke query yang gak perlu).
 */
async function findPasswordHashById(id, runner = db) {
  const result = await runner.query(`SELECT password_hash FROM users WHERE id = $1`, [id]);
  return result.rows[0] ? result.rows[0].password_hash : null;
}

module.exports = {
  findActiveUserByUsername,
  findByUsernameAnyStatus,
  findUserById,
  findPasswordHashById,
  updateLastLogin,
  findAll,
  findRawById,
  usernameExists,
  roleExists,
  findRoleNameById,
  createUser,
  updateUser,
  findActiveEmailsByRoles,
  approveUser,
  rejectUser,
};