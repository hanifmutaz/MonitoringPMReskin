// 1700000001000_seed-admin-user.js
// Seed user Admin pertama untuk login awal.
// Password WAJIB di-hash lewat bcrypt di Node.js (bukan hardcode di file SQL)
// sesuai catatan implementasi di 04_DATABASE_SCHEMA.sql.
//
// Kredensial default diambil dari ENV (ADMIN_DEFAULT_USERNAME/PASSWORD/FULLNAME)
// supaya tidak ada password hardcoded di source code. Ganti password ini
// segera setelah login pertama kali di production.

const bcrypt = require('bcrypt');
const { validatePassword } = require('../src/utils/passwordPolicy');

const BCRYPT_ROUNDS = 10;

exports.up = async (pgm) => {
  const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const isProduction = process.env.NODE_ENV === 'production';
  // Di production, password admin WAJIB di-set eksplisit & lolos password
  // policy — tidak ada fallback default yang bisa ditebak. Di dev/test tetap
  // fallback ke 'ChangeMe123!' supaya setup lokal & CI gak ribet.
  if (isProduction && !process.env.ADMIN_DEFAULT_PASSWORD) {
    throw new Error(
      '[MIGRATION seed-admin-user] ADMIN_DEFAULT_PASSWORD wajib di-set saat NODE_ENV=production ' +
        '(tidak ada default password di production).'
    );
  }
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
  if (isProduction) {
    const check = validatePassword(password, username);
    if (!check.valid) {
      throw new Error(`[MIGRATION seed-admin-user] ADMIN_DEFAULT_PASSWORD ditolak password policy: ${check.error}`);
    }
  }
  const fullName = process.env.ADMIN_DEFAULT_FULLNAME || 'Administrator';

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Idempotent: kalau migration pernah jalan sebagian / re-run di environment
  // yang usernya udah ada, jangan gagal / jangan duplikat.
  await pgm.db.query(
    `
    INSERT INTO users (username, password_hash, role_id, full_name, is_active)
    SELECT $1, $2, r.id, $3, TRUE
    FROM roles r
    WHERE r.name = 'Admin'
    ON CONFLICT (username) DO NOTHING
    `,
    [username, passwordHash, fullName]
  );
};

exports.down = async (pgm) => {
  const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  await pgm.db.query(`DELETE FROM users WHERE username = $1`, [username]);
};
