// scripts/diagnose-login.js
// Jalanin dari folder backend: node scripts/diagnose-login.js [username]
//
// Diagnosa kenapa login user ditolak (user ada? aktif? APPROVED? soft-deleted?).
// SENGAJA tidak nge-print DATABASE_URL, hash password, atau mencoba tebak
// password — output script ini aman ditempel ke chat/ticket.
// Menolak jalan di production kecuali ALLOW_DIAGNOSE=true.
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DIAGNOSE !== 'true') {
    console.error('[DITOLAK] NODE_ENV=production. Set ALLOW_DIAGNOSE=true kalau memang sengaja.');
    process.exit(1);
  }

  const username = process.argv[2] || 'admin';
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.is_active, u.status, u.deleted_at, u.role_id, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User "${username}" TIDAK DITEMUKAN di database ini (dicek TANPA filter apapun).`);
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

    if (!user.is_active) console.log('⚠️  is_active = FALSE -> ini yang bikin login ditolak (LOGIN_FAILED_ACCOUNT_DISABLED)');
    if (user.status !== 'APPROVED') console.log(`⚠️  status = "${user.status}" (bukan APPROVED) -> ini yang bikin login ditolak`);
    if (user.deleted_at) console.log('⚠️  deleted_at TERISI -> user dianggap sudah dihapus (soft delete)');
    if (!user.role) console.log('⚠️  role kosong -> user tidak punya role valid');
    console.log('Kalau semua flag di atas normal, kemungkinan besar password salah: reset via scripts/reset-password.js');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
