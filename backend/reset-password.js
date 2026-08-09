// reset-password.js
//
// Script sekali-pakai buat reset password user langsung ke DB, kalau lupa
// password dan bukan lewat User Management (mis. Admin sendiri yang
// ke-lock). Pakai koneksi & config yang sama dengan aplikasi (.env di
// folder backend/), jadi jalanin dari dalam folder backend/.
//
// USAGE:
//   node reset-password.js <username> <password_baru>
//
// Contoh:
//   node reset-password.js admin PasswordBaru123!
//
// PENTING: hapus file ini setelah selesai dipakai — jangan biarkan
// nangkring di production, karena siapa pun yang punya akses shell +
// akses DB bisa reset password siapa saja pakai script ini.

const bcrypt = require('bcrypt');
const db = require('./src/config/db');

const BCRYPT_ROUNDS = 10;

async function main() {
  const [, , username, newPassword] = process.argv;

  if (!username || !newPassword) {
    console.error('Usage: node reset-password.js <username> <password_baru>');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('[GAGAL] Password baru minimal 8 karakter (samain minimal dengan passwordPolicy.js).');
    process.exit(1);
  }

  const { rows } = await db.query(
    'SELECT id, username, is_active, status FROM users WHERE username = $1',
    [username]
  );

  if (rows.length === 0) {
    console.error(`[GAGAL] User "${username}" tidak ditemukan.`);
    process.exit(1);
  }

  const user = rows[0];
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

  console.log(`[OK] Password untuk user "${user.username}" (id=${user.id}) berhasil di-reset.`);

  if (!user.is_active) {
    console.warn('[WARNING] is_active user ini FALSE — masih tidak akan bisa login sampai diaktifkan lagi.');
  }
  if (user.status && user.status !== 'APPROVED') {
    console.warn(`[WARNING] status user ini "${user.status}" — masih tidak akan bisa login sampai status jadi APPROVED.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
