// server.js
const app = require('./app');
const env = require('./src/config/env');
const db = require('./src/config/db');
const conmasDb = require('./src/config/conmasDb');
const logger = require('./src/utils/logger');
const conmasSyncJob = require('./src/jobs/conmasSyncJob');
const notificationJob = require('./src/jobs/notificationJob');
const backupJob = require('./src/jobs/backupJob');

// Batas waktu menunggu request yang lagi jalan selesai sebelum dipaksa mati.
// Harus < stop_grace_period orchestrator (docker default 10s -> lihat
// docker-compose.yml yang nge-set 30s).
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 20000;

let server = null;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} diterima — graceful shutdown dimulai`);

  // Paksa keluar kalau ada request/koneksi yang nge-hang.
  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout — force exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    // 1. Berhenti nerima cron job baru.
    conmasSyncJob.stop();
    notificationJob.stop();
    backupJob.stop();

    // 2. Berhenti nerima koneksi baru, tunggu request berjalan selesai.
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // 3. Tutup pool DB terakhir, setelah semua request selesai.
    await conmasDb.close();
    await db.pool.end();

    logger.info('Shutdown selesai');
    process.exit(exitCode);
  } catch (err) {
    logger.error('Error saat shutdown', err);
    process.exit(1);
  }
}

async function start() {
  try {
    // Cek koneksi DB saat startup — gagal cepat kalau DB tidak bisa diakses,
    // daripada baru ketahuan saat request pertama masuk.
    await db.query('SELECT 1');
    logger.info('Database connection OK');

    server = app.listen(env.port, () => {
      logger.info(`PM Monitoring API running on port ${env.port} (${env.nodeEnv})`);
    });

    // Sync job ConMas jalan independen dari server HTTP - kalau ConMas gak
    // reachable, cuma log warning (lihat conmasSyncService.js), server API
    // tetap jalan normal.
    conmasSyncJob.start().catch((err) => logger.error('Gagal start ConMas sync job', err));

    // Notification job juga independen - kalau SMTP belum dikonfigurasi,
    // cuma log warning per email (lihat mailer.js), server API tetap normal.
    notificationJob.start().catch((err) => logger.error('Gagal start notification job', err));

    // Backup otomatis: aktif/tidaknya & jadwalnya dibaca dari Settings (default
    // nonaktif). Gagal start tidak mengganggu API.
    backupJob.start().catch((err) => logger.error('Gagal start backup job', err));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Error yang lolos dari semua handler: log dulu, lalu keluar bersih supaya
// process manager (docker/pm2) restart di state yang bersih — melanjutkan
// jalan setelah uncaughtException = state tidak terjamin.
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', err);
  shutdown('uncaughtException', 1);
});

start();
