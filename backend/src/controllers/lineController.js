// src/controllers/lineController.js
const lineService = require('../services/lineService');
const { validateCreateLine, validateUpdateLine } = require('../validators/lineValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const isActive = req.query.is_active === undefined ? undefined : req.query.is_active === 'true';
  const data = await lineService.listLines({ isActive });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreateLine(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await lineService.createLine(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateLine(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await lineService.updateLine(Number(req.params.id), req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await lineService.deleteLine(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, create, update, remove };
