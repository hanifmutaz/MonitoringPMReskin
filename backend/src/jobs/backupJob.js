// src/jobs/backupJob.js
//
// Development Rules §17: semua cron job ada di folder jobs/.
//
// Backup database otomatis, diatur dari Settings > Umum > Backup Otomatis
// (kategori `backup_otomatis`, migration 1700000030000).
//
// Cara kerja: cron berjalan SETIAP HARI pada jam yang diset (zona WIB). Setiap
// kali berbunyi, isDue() memutuskan apakah backup benar-benar dibuat, supaya
// interval "tiap N hari" tidak patah di pergantian bulan (cron `*/N` pada
// kolom tanggal akan mereset hitungan tiap tanggal 1). Pengecekan yang sama
// dijalankan sekali saat server start, jadi kalau server mati tepat di jam
// jadwal, backup yang terlewat dibuat begitu server hidup lagi (dengan syarat
// jam jadwal hari itu sudah lewat).
//
// Perubahan setting dipakai TANPA restart: settingsController memanggil
// reload() setelah key `backup_auto_*` diubah.
const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const settingsService = require('../services/settingsService');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';
const SETTING_KEYS = [
  'backup_auto_enabled',
  'backup_auto_time',
  'backup_auto_interval_days',
  'backup_auto_format',
  'backup_auto_keep',
];

let scheduledTask = null;

async function readConfig() {
  const s = await settingsService.getSettings(SETTING_KEYS);
  return {
    enabled: s.backup_auto_enabled === true,
    time: typeof s.backup_auto_time === 'string' ? s.backup_auto_time : '02:00',
    intervalDays: Math.max(1, Math.floor(Number(s.backup_auto_interval_days) || 1)),
    format: s.backup_auto_format || backupService.DEFAULT_FORMAT,
    keep: Math.max(1, Math.floor(Number(s.backup_auto_keep) || 7)),
  };
}

/**
 * Fungsi MURNI (tanpa DB/IO) supaya bisa di-unit-test langsung.
 * @param {{time:string, intervalDays:number}} cfg
 * @param {dayjs.Dayjs|null} lastAutoAt - waktu backup otomatis terakhir (null = belum pernah)
 * @param {dayjs.Dayjs} now
 * @returns {boolean}
 */
function isDue(cfg, lastAutoAt, now) {
  const [hh, mm] = cfg.time.split(':').map(Number);
  const nowWib = now.tz(TZ);
  // Belum masuk jam jadwal hari ini -> belum waktunya.
  if (nowWib.hour() * 60 + nowWib.minute() < hh * 60 + mm) return false;
  if (!lastAutoAt) return true;
  // Selisih dalam HARI KALENDER WIB (bukan 24 jam), jadi backup jam 02:00 kemarin
  // dan jam 02:00 hari ini terhitung "1 hari" walau selisihnya 23j59m.
  const lastDay = dayjs(lastAutoAt.tz(TZ).format('YYYY-MM-DD'));
  const today = dayjs(nowWib.format('YYYY-MM-DD'));
  return today.diff(lastDay, 'day') >= cfg.intervalDays;
}

async function lastAutoBackupAt() {
  const files = await backupService.listStoredBackups();
  const newest = files.find((f) => f.trigger === 'auto'); // terurut terbaru dulu
  return newest ? dayjs(newest.created_at) : null;
}

async function runIfDue(reason) {
  const cfg = await readConfig();
  if (!cfg.enabled) return { ran: false, reason: 'disabled' };
  if (backupService.isRunning()) return { ran: false, reason: 'busy' };
  if (!isDue(cfg, await lastAutoBackupAt(), dayjs())) return { ran: false, reason: 'not-due' };

  logger.info(`[BACKUP] menjalankan backup otomatis (${reason})`, { format: cfg.format });
  try {
    await backupService.createStoredBackup({ format: cfg.format, trigger: 'auto', keep: cfg.keep });
    return { ran: true };
  } catch (err) {
    // Sudah di-log & dicatat ke status/audit oleh createStoredBackup; jangan
    // lempar lagi supaya 1 kegagalan tidak mematikan jadwal berikutnya.
    return { ran: false, reason: 'failed', error: err.message };
  }
}

function stop() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

/** Baca setting terbaru lalu jadwalkan ulang. Aman dipanggil berkali-kali. */
async function reload() {
  stop();
  const cfg = await readConfig();
  if (!cfg.enabled) {
    logger.info('[BACKUP] backup otomatis nonaktif');
    return;
  }
  const [hh, mm] = cfg.time.split(':').map(Number);
  const cronExpr = `${mm} ${hh} * * *`;
  scheduledTask = cron.schedule(
    cronExpr,
    () => {
      runIfDue('jadwal').catch((err) => logger.error('[BACKUP] job backup otomatis crashed', err));
    },
    { timezone: TZ }
  );
  logger.info(`[BACKUP] backup otomatis dijadwalkan ${cfg.time} WIB, tiap ${cfg.intervalDays} hari, format ${cfg.format}, simpan ${cfg.keep} file`);
}

async function start() {
  await reload();
  // Kejar backup yang terlewat (server mati di jam jadwal). Tidak di-await oleh server.js.
  runIfDue('kejar jadwal saat start').catch((err) => logger.error('[BACKUP] job backup otomatis (start) crashed', err));
}

module.exports = { start, stop, reload, runIfDue, isDue };
