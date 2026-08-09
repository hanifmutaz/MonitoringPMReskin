// Jalanin dari folder backend: node diagnose-login.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('DATABASE_URL yang dipakai:', process.env.DATABASE_URL);

  const result = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1`,
    ['admin']
  );

  if (result.rows.length === 0) {
    console.log('❌ User "admin" TIDAK DITEMUKAN di database ini.');
    process.exit(1);
  }

  const user = result.rows[0];
  console.log('User ditemukan:', { id: user.id, username: user.username, role: user.role, is_active: user.is_active });
  console.log('Hash tersimpan:', user.password_hash);

  const testPassword = 'Admin123!';
  const match = await bcrypt.compare(testPassword, user.password_hash);
  console.log(`\nTes password "${testPassword}" vs hash tersimpan:`, match ? '✅ COCOK' : '❌ TIDAK COCOK');

  await pool.end();
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
