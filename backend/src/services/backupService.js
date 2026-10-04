// src/services/backupService.js
//
// Backup database aplikasi lewat `pg_dump` (format custom -Fc, SAMA dengan
// perintah backup di README -> restore dengan `pg_restore`).
//
// Desain:
//  - Dump ditulis dulu ke file sementara (0600), baru dikirim ke client. Jadi
//    kalau pg_dump gagal, client dapat error JSON yang jelas (bukan file
//    setengah jadi), dan response punya Content-Length.
//  - Password DB dikirim lewat env PGPASSWORD, TIDAK lewat argumen CLI (argumen
//    kelihatan di daftar proses server).
//  - Cuma 1 backup berjalan sekaligus (409 kalau ada yang sedang jalan).
//  - Ada timeout (BACKUP_TIMEOUT_MS) supaya proses tidak menggantung.
//  - Yang dicadangkan: SELURUH isi database (termasuk akun & hash password),
//    jadi file backup harus diperlakukan sebagai data sensitif.
//  - Foto profil (volume uploads) BUKAN bagian dari dump DB - lihat README.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const env = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../utils/auditLog');

dayjs.extend(utc);
dayjs.extend(timezone);

let running = false;

// Kegagalan pg_dump dilaporkan sebagai 424 (Failed Dependency), BUKAN 5xx:
// errorHandler global menyamarkan pesan 5xx jadi "Internal server error",
// padahal Admin perlu tahu apa yang harus dibereskan (pg_dump belum terpasang,
// versi tidak cocok, dst). Pesan di sini sengaja tidak memuat stderr mentah
// pg_dump / kredensial - detail lengkap hanya masuk log server.
const STATUS_DEPENDENCY_FAILED = 424;

/** Pecah DATABASE_URL jadi argumen/env untuk pg_dump (tanpa password di argv). */
function buildPgDumpInvocation(databaseUrl, outFile) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new AppError('DATABASE_URL tidak valid, backup tidak bisa dijalankan', 500);
  }
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const args = ['--format=custom', '--no-password', '--file', outFile];
  if (url.hostname) args.push('--host', url.hostname);
  if (url.port) args.push('--port', url.port);
  if (url.username) args.push('--username', decodeURIComponent(url.username));
  args.push('--dbname', dbName);

  const childEnv = { ...process.env };
  if (url.password) childEnv.PGPASSWORD = decodeURIComponent(url.password);
  if (env.dbPool.ssl) childEnv.PGSSLMODE = env.dbPool.ssl.rejectUnauthorized ? 'verify-full' : 'require';
  return { args, env: childEnv };
}

/** Jalankan pg_dump -> file. Resolve kalau sukses, reject AppError kalau gagal. */
function runPgDump(outFile) {
  const { args, env: childEnv } = buildPgDumpInvocation(env.databaseUrl, outFile);

  return new Promise((resolve, reject) => {
    const child = spawn(env.backup.pgDumpPath, args, { env: childEnv, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      logger.error('[BACKUP] pg_dump melebihi batas waktu', { timeoutMs: env.backup.timeoutMs });
      finish(reject, new AppError('Backup dibatalkan: melebihi batas waktu', STATUS_DEPENDENCY_FAILED));
    }, env.backup.timeoutMs);

    child.stderr.on('data', (chunk) => {
      // Batasi buffer; pesan error pg_dump pendek.
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    child.on('error', (err) => {
      logger.error('[BACKUP] gagal menjalankan pg_dump', err);
      if (err.code === 'ENOENT') {
        finish(
          reject,
          new AppError(
            'pg_dump tidak ditemukan di server. Pasang PostgreSQL client (versi sama dengan server DB) atau isi PG_DUMP_PATH di backend/.env.',
            STATUS_DEPENDENCY_FAILED
          )
        );
      } else {
        finish(reject, new AppError('Backup gagal dijalankan, cek log server', STATUS_DEPENDENCY_FAILED));
      }
    });

    child.on('close', (code) => {
      if (code === 0) return finish(resolve);
      logger.error('[BACKUP] pg_dump keluar dengan kode non-nol', { code, stderr: stderr.trim() });
      // Pesan versi-mismatch itu paling sering terjadi & actionable; sisanya generik.
      const hint = /server version mismatch|version mismatch/i.test(stderr)
        ? ' (versi pg_dump lebih lama dari server DB - pakai PostgreSQL client versi yang sama)'
        : '';
      return finish(reject, new AppError(`Backup gagal${hint}. Cek log server untuk detail.`, STATUS_DEPENDENCY_FAILED));
    });
  });
}

/**
 * Buat backup & kirim sebagai download. Dipanggil dari controller.
 * @param {import('express').Response} res
 * @param {{id:number}} user
 */
async function createAndSendBackup(res, user) {
  if (running) throw new AppError('Backup lain sedang berjalan, coba lagi sebentar', 409);
  running = true;

  const filename = `pm-monitoring-backup-${dayjs().tz('Asia/Jakarta').format('YYYYMMDD-HHmm')}.dump`;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pm-backup-'));
  const tmpFile = path.join(tmpDir, filename);

  const cleanup = async () => {
    running = false;
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    await runPgDump(tmpFile);
    const { size } = await fs.promises.stat(tmpFile);

    await recordAudit({
      tableName: 'backup',
      recordId: null,
      action: 'CREATE',
      userId: user.id,
      actionDetail: `Backup database diunduh (${filename}, ${(size / 1024 / 1024).toFixed(2)} MB)`,
    });
    logger.info('[BACKUP] backup database dibuat', { filename, size, userId: user.id });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'no-store');

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(tmpFile);
      stream.on('error', reject);
      res.on('close', resolve); // selesai ATAU client memutus koneksi
      stream.pipe(res);
    });
  } finally {
    await cleanup();
  }
}

module.exports = { createAndSendBackup, buildPgDumpInvocation };
