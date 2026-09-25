// src/controllers/settingsController.js
const settingsService = require('../services/settingsService');
const conmasSyncJob = require('../jobs/conmasSyncJob');
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

module.exports = { list, update, updateAccess, syncNow };
