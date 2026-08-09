// src/jobs/notificationJob.js
//
// Development Rules §17: "Semua Cron Job berada di folder jobs/. Tidak
// boleh dijalankan langsung dari controller."
//
// Job ini jalan tiap 1 jam - CEK-nya sering (supaya part yang baru masuk
// DANGER cepat kekirim notifnya), tapi PENGIRIMAN aktual tetap dijaga jeda
// oleh notif_pm_part_interval_hours di notificationService (jadi 1 part
// yang sama tidak spam email tiap jam walau job-nya cek tiap jam).

const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const CHECK_CRON_EXPR = '0 * * * *'; // tiap jam, menit ke-0

let scheduledTask = null;

async function runOnce() {
  const pmPartResult = await notificationService.checkAndSendPmPartNotifications();
  if (pmPartResult.enabled && (pmPartResult.sent > 0 || pmPartResult.skipped_no_recipient > 0)) {
    logger.info(
      `Notification job (PM Part Danger): ${pmPartResult.checked} part DANGER, ${pmPartResult.sent} email terkirim, ${pmPartResult.skipped_no_recipient} dilewati (tanpa penerima email)`
    );
  }

  const inventoryResult = await notificationService.checkAndSendInventoryOrderNotifications();
  if (inventoryResult.enabled && (inventoryResult.sent > 0 || inventoryResult.skipped_no_recipient > 0)) {
    logger.info(
      `Notification job (Inventory Order): ${inventoryResult.checked} item ORDER, ${inventoryResult.sent} email terkirim, ${inventoryResult.skipped_no_recipient} dilewati (tanpa penerima email)`
    );
  }
}

async function start() {
  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(CHECK_CRON_EXPR, () => {
    runOnce().catch((err) => logger.error('Notification job crashed', err));
  });

  logger.info(`Notification job dijadwalkan tiap jam (${CHECK_CRON_EXPR})`);

  // Jalankan sekali di awal juga, gak nunggu jam pertama abis
  runOnce().catch((err) => logger.error('Notification job (initial run) crashed', err));
}

module.exports = { start, runOnce };
