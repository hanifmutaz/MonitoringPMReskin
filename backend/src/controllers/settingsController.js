// src/controllers/settingsController.js
const settingsService = require('../services/settingsService');
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
  const data = await settingsService.updateSetting(req.params.key, req.body.value, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list, update };
