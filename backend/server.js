// server.js
const app = require('./app');
const env = require('./src/config/env');
const db = require('./src/config/db');
const logger = require('./src/utils/logger');
const conmasSyncJob = require('./src/jobs/conmasSyncJob');
const notificationJob = require('./src/jobs/notificationJob');

async function start() {
  try {
    // Cek koneksi DB saat startup — gagal cepat kalau DB tidak bisa diakses,
    // daripada baru ketahuan saat request pertama masuk.
    await db.query('SELECT 1');
    logger.info('Database connection OK');

    app.listen(env.port, () => {
      logger.info(`PM Monitoring API running on port ${env.port} (${env.nodeEnv})`);
    });

    // Sync job ConMas jalan independen dari server HTTP - kalau ConMas gak
    // reachable, cuma log warning (lihat conmasSyncService.js), server API
    // tetap jalan normal.
    conmasSyncJob.start().catch((err) => logger.error('Gagal start ConMas sync job', err));

    // Notification job juga independen - kalau SMTP belum dikonfigurasi,
    // cuma log warning per email (lihat mailer.js), server API tetap normal.
    notificationJob.start().catch((err) => logger.error('Gagal start notification job', err));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
