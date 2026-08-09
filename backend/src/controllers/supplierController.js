// src/controllers/supplierController.js
const supplierService = require('../services/supplierService');
const { validateCreateSupplier, validateUpdateSupplier } = require('../validators/supplierValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const isActive = req.query.is_active === undefined ? undefined : req.query.is_active === 'true';
  const data = await supplierService.listSuppliers({ isActive, search: req.query.search });
  res.status(200).json({ success: true, message: 'Success', data });
});

const detail = asyncHandler(async (req, res) => {
  const data = await supplierService.getSupplierDetail(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreateSupplier(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await supplierService.createSupplier(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateSupplier(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await supplierService.updateSupplier(Number(req.params.id), req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, detail, create, update, remove };
