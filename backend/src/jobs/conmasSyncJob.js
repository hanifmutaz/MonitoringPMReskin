// src/jobs/conmasSyncJob.js
//
// Development Rules §17: "Semua Cron Job berada di folder jobs/. Tidak
// boleh dijalankan langsung dari controller."
//
// 1 jadwal buat 3 tugas berurutan (sync production_cache DULU, baru
// recompute akumulasi poin PM Monthly + snapshot status PM Part -
// keduanya butuh data production_cache terbaru dari ConMas, sumbernya
// sama). Snapshot PM Part status: lihat migration 1700000021000 &
// pmPartSnapshotService.js (menutup TECHNICAL_DEBT.md #1) - status yang
// dibaca listPmPart(status=...) bisa telat maksimal 1 interval job ini,
// trade-off yang sama seperti akumulasi_poin_monthly.

const cron = require('node-cron');
const conmasSyncService = require('../services/conmasSyncService');
const pmMonthlyAccrualService = require('../services/pmMonthlyAccrualService');
const pmPartSnapshotService = require('../services/pmPartSnapshotService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

let scheduledTask = null;

async function runOnce() {
  await conmasSyncService.runSync();
  await pmMonthlyAccrualService.recomputeAllLines();

  // Sengaja TIDAK di-skip walau conmasDb belum configured (beda dari
  // pmMonthlyAccrualService di atas) - snapshot status PM Part tidak
  // butuh data ConMas baru, cukup production_cache yang sudah ada di DB
  // sendiri (sama seperti getAllComputedMetrics() yang dipakai listPmPart
  // real-time selama ini). Kalau ConMas belum configured, production_cache
  // memang tidak ter-update, tapi snapshot tetap dihitung dari data yang
  // ada supaya listPmPart(status=...) tetap konsisten dengan jalur
  // real-time (findAllWithCounter).
  try {
    await pmPartSnapshotService.recomputeAll();
  } catch (err) {
    logger.error('Recompute PM Part status snapshot gagal', err);
  }
}

async function start() {
  const intervalMinutes = (await settingsService.getSetting('sync_interval_minutes')) || 30;
  // node-cron pakai cron expression. Interval menit dibaca dari Settings
  // saat startup (Development Rules §18 - bukan hardcode); perubahan value
  // butuh restart backend supaya jadwal baru kepakai (trade-off yang wajar
  // untuk config yang jarang berubah).
  const clampedInterval = Math.min(Math.max(Math.round(intervalMinutes), 1), 59);
  const cronExpr = `*/${clampedInterval} * * * *`;

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronExpr, () => {
    runOnce().catch((err) => logger.error('ConMas sync job crashed', err));
  });

  logger.info(`ConMas sync job dijadwalkan tiap ${clampedInterval} menit (${cronExpr})`);

  // Jalankan sekali di awal juga, gak nunggu interval pertama abis
  runOnce().catch((err) => logger.error('ConMas sync job (initial run) crashed', err));
}

module.exports = { start, runOnce };
