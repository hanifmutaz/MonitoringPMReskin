// src/controllers/masterDataImportController.js
const masterDataImportService = require('../services/masterDataImportService');
const { validateCommitPayload } = require('../validators/masterDataImportValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const preview = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('Validasi gagal', { file: 'File Excel wajib diupload (field "file")' });
  }
  const data = await masterDataImportService.parsePreview(req.file.buffer);
  res.status(200).json({ success: true, message: 'Success', data });
});

const commit = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCommitPayload(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await masterDataImportService.commitImport(req.body.rows, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { preview, commit };
