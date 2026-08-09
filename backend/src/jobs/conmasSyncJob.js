// src/jobs/conmasSyncJob.js
//
// Development Rules §17: "Semua Cron Job berada di folder jobs/. Tidak
// boleh dijalankan langsung dari controller."
//
// 1 jadwal buat 2 tugas berurutan (sync production_cache DULU, baru
// recompute akumulasi poin PM Monthly - karena accrual butuh data
// run-count terbaru dari ConMas juga, sumbernya sama).

const cron = require('node-cron');
const conmasSyncService = require('../services/conmasSyncService');
const pmMonthlyAccrualService = require('../services/pmMonthlyAccrualService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

let scheduledTask = null;

async function runOnce() {
  await conmasSyncService.runSync();
  await pmMonthlyAccrualService.recomputeAllLines();
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
