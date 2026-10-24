// src/controllers/lineCleaningController.js
const lineIdleService = require('../services/lineIdleService');
const { validateCreateLineCleaning } = require('../validators/lineCleaningValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const lineId = Number(req.query.line_id);
  if (!Number.isInteger(lineId) || lineId <= 0) {
    throw AppError.badRequest('Validasi gagal', { line_id: 'line_id wajib diisi (integer)' });
  }
  const data = await lineIdleService.listCleaning(lineId);
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const body = {
    ...req.body,
    line_id: req.body.line_id !== undefined ? Number(req.body.line_id) : undefined,
  };

  const { valid, errors } = validateCreateLineCleaning(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await lineIdleService.submitCleaning(
    {
      line_id: body.line_id,
      tgl_cleaning: body.tgl_cleaning || undefined,
      pic_name: body.pic_name.trim(),
      keterangan: body.keterangan ? body.keterangan.trim() : null,
    },
    req.user.id
  );
  res.status(201).json({ success: true, message: 'Success', data });
});

module.exports = { list, create };
