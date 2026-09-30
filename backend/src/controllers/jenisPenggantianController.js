// src/controllers/jenisPenggantianController.js
const jenisService = require('../services/jenisPenggantianService');
const { validateCreate, validateUpdate } = require('../validators/jenisPenggantianValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const isActive = req.query.is_active === undefined ? undefined : req.query.is_active === 'true';
  const data = await jenisService.listJenis({ isActive });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreate(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await jenisService.createJenis(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdate(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await jenisService.updateJenis(Number(req.params.id), req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list, create, update };
