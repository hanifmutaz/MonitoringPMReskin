// Jalanin dari folder backend: node diagnose-login.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('DATABASE_URL yang dipakai:', process.env.DATABASE_URL);

  const result = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.is_active, u.status, u.deleted_at,
            u.role_id, r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1`,
    ['admin']
  );

  if (result.rows.length === 0) {
    console.log('❌ User "admin" TIDAK DITEMUKAN di database ini (dicek TANPA filter apapun).');
    process.exit(1);
  }

  const user = result.rows[0];
  console.log('User ditemukan:', {
    id: user.id,
    username: user.username,
    role: user.role,
    role_id: user.role_id,
    is_active: user.is_active,
    status: user.status,
    deleted_at: user.deleted_at,
  });
  console.log('Hash tersimpan:', user.password_hash);

  if (!user.is_active) console.log('⚠️  is_active = FALSE -> ini yang bikin login ditolak (LOGIN_FAILED_ACCOUNT_DISABLED)');
  if (user.status !== 'APPROVED') console.log(`⚠️  status = "${user.status}" (bukan APPROVED) -> ini yang bikin login ditolak`);
  if (user.deleted_at) console.log('⚠️  deleted_at TERISI -> user dianggap sudah dihapus (soft delete)');

  const candidates = ['admin1234567', process.env.ADMIN_DEFAULT_PASSWORD].filter(Boolean);
  for (const pw of candidates) {
    const match = await bcrypt.compare(pw, user.password_hash);
    console.log(`Tes password "${pw}" vs hash tersimpan:`, match ? '✅ COCOK' : '❌ TIDAK COCOK');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});