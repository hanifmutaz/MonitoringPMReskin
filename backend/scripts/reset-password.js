// scripts/reset-password.js
//
// Script ops buat reset password user langsung ke DB (mis. Admin sendiri yang
// ke-lock). Pakai koneksi & config yang sama dengan aplikasi (.env di
// backend/), jalanin dari folder backend/.
//
// USAGE (password dibaca dari env var / prompt, BUKAN dari argumen, supaya
// tidak nyangkut di shell history & `ps`):
//   NEW_PASSWORD='...' node scripts/reset-password.js <username>
//   node scripts/reset-password.js <username>          (akan diminta input)
//
// GUARD PRODUCTION: kalau NODE_ENV=production, script menolak jalan kecuali
// ALLOW_RESET_PASSWORD=true di-set eksplisit (sengaja "friction" kecil supaya
// tidak kejalan tanpa sadar).
//
// Script ini TIDAK ikut ke Docker image production (lihat .dockerignore) —
// jalankan dari mesin ops yang punya checkout repo + akses ke DB (mis. lewat
// SSH tunnel) dengan DATABASE_URL yang sesuai.

const readline = require('readline');
const bcrypt = require('bcrypt');
const db = require('../src/config/db');
const env = require('../src/config/env');
const { validatePassword } = require('../src/utils/passwordPolicy');

const BCRYPT_ROUNDS = 10;

function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Mute echo: tulis prompt manual, lalu buang karakter yang diketik.
    rl._writeToOutput = (str) => {
      if (str.startsWith(question)) rl.output.write(str);
      else rl.output.write('');
    };
    rl.question(question, (answer) => {
      rl.output.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const [, , username] = process.argv;

  if (!username) {
    console.error('Usage: node scripts/reset-password.js <username>   (password via NEW_PASSWORD atau prompt)');
    process.exit(1);
  }

  if (env.nodeEnv === 'production' && process.env.ALLOW_RESET_PASSWORD !== 'true') {
    console.error('[DITOLAK] NODE_ENV=production. Set ALLOW_RESET_PASSWORD=true kalau memang sengaja.');
    process.exit(1);
  }

  const newPassword = process.env.NEW_PASSWORD || (await promptPassword('Password baru: '));

  const check = validatePassword(newPassword, username);
  if (!check.valid) {
    console.error(`[GAGAL] ${check.error}`);
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
  console.log('     Catatan: reset lewat script ini TIDAK tercatat di audit_log aplikasi — catat manual di log ops.');

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
