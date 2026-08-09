// src/controllers/partSupplierController.js
const partSupplierService = require('../services/partSupplierService');
const {
  validateCreatePartSupplier,
  validateSetPrimary,
} = require('../validators/partSupplierValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const data = await partSupplierService.listByPart(Number(req.params.partId));
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreatePartSupplier(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await partSupplierService.createLink(Number(req.params.partId), req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const updateNotes = asyncHandler(async (req, res) => {
  const data = await partSupplierService.updateNotes(Number(req.params.id), req.body.notes ?? null, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const setPrimary = asyncHandler(async (req, res) => {
  const { valid, errors } = validateSetPrimary(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await partSupplierService.setPrimary(Number(req.params.id), req.body.is_primary, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await partSupplierService.deleteLink(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, create, updateNotes, setPrimary, remove };
