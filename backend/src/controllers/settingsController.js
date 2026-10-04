// src/controllers/settingsController.js
const settingsService = require('../services/settingsService');
const conmasSyncJob = require('../jobs/conmasSyncJob');
const backupService = require('../services/backupService');
const backupJob = require('../jobs/backupJob');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const data = await settingsService.listSettings();
  res.status(200).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  if (req.body === undefined || req.body.value === undefined) {
    throw AppError.badRequest('Validasi gagal', { value: 'Value wajib diisi' });
  }
  const data = await settingsService.updateSetting(req.params.key, req.body.value, req.user);
  // Jadwal backup otomatis langsung ikut berubah tanpa restart server. Gagal
  // reload tidak menggagalkan penyimpanan setting (nilainya sudah tersimpan,
  // dan dipakai lagi saat start berikutnya).
  if (req.params.key.startsWith('backup_auto_')) {
    await backupJob.reload().catch((err) => logger.error('[BACKUP] gagal memuat ulang jadwal backup otomatis', err));
  }
  res.status(200).json({ success: true, message: 'Success', data });
});

// PATCH /settings/:key/access - Admin only (roleMiddleware di route),
// body { role_ids: [1, 2, ...] } - role NON-Admin yang boleh edit key ini.
const updateAccess = asyncHandler(async (req, res) => {
  const { role_ids: roleIds } = req.body || {};
  if (!Array.isArray(roleIds) || roleIds.some((id) => !Number.isInteger(id))) {
    throw AppError.badRequest('Validasi gagal', { role_ids: 'role_ids wajib array of integer' });
  }
  const data = await settingsService.setSettingAccess(req.params.key, roleIds, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

// POST /settings/sync-conmas - trigger manual full siklus sync (production_cache
// + recompute akumulasi poin Monthly + snapshot status PM Part), sinkron
// dengan yang dijalankan cron job (conmasSyncJob.runOnce) - dibuat karena
// nunggu jadwal cron pas testing kelamaan. Admin only (route level, sama
// dengan Settings lain - trigger sync manual cukup sensitif buat dibuka
// granular per role di tahap ini).
const syncNow = asyncHandler(async (req, res) => {
  const result = await conmasSyncJob.runOnce();
  res.status(200).json({ success: true, message: 'Sync selesai', data: result });
});

// POST /settings/backup?format=dump|sql|xlsx - Admin only (route level).
// Default dump (pg_dump -Fc). Lihat backupService.js untuk beda tiap format.
const backup = asyncHandler(async (req, res) => {
  const format = req.query.format || backupService.DEFAULT_FORMAT;
  if (!Object.prototype.hasOwnProperty.call(backupService.FORMATS, format)) {
    throw AppError.badRequest('Validasi gagal', { format: `Pilih salah satu: ${Object.keys(backupService.FORMATS).join(', ')}` });
  }
  await backupService.createAndSendBackup(res, req.user, format);
});

// GET /settings/backup/auto - status backup tersimpan di server (hasil run
// terakhir + daftar file). Admin only (route level).
const autoBackupStatus = asyncHandler(async (req, res) => {
  const data = await backupService.getStoredBackupStatus();
  res.status(200).json({ success: true, message: 'Success', data });
});

// POST /settings/backup/auto/run - jalankan backup SEKARANG dan simpan di
// server (bukan diunduh), memakai format & jumlah simpan dari setting
// backup_auto_*. Berguna untuk memastikan pg_dump/folder backup beres tanpa
// menunggu jadwal. Admin only (route level).
const autoBackupRun = asyncHandler(async (req, res) => {
  const cfg = await settingsService.getSettings(['backup_auto_format', 'backup_auto_keep']);
  const data = await backupService.createStoredBackup({
    format: cfg.backup_auto_format || backupService.DEFAULT_FORMAT,
    trigger: 'manual',
    keep: cfg.backup_auto_keep || 7,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, message: 'Backup tersimpan di server', data });
});

// GET /settings/backup/auto/files/:name - unduh 1 file backup tersimpan.
// Nama divalidasi ketat di backupService.resolveStoredBackup (anti path traversal).
const autoBackupDownload = asyncHandler(async (req, res) => {
  const file = await backupService.resolveStoredBackup(req.params.name);
  const contentType = backupService.FORMATS[file.format].contentType;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.setHeader('Content-Length', String(file.size));
  res.setHeader('Cache-Control', 'no-store');
  await new Promise((resolve, reject) => {
    res.sendFile(file.filePath, { dotfiles: 'deny' }, (err) => (err ? reject(err) : resolve()));
  });
});

module.exports = { list, update, updateAccess, syncNow, backup, autoBackupStatus, autoBackupRun, autoBackupDownload };
