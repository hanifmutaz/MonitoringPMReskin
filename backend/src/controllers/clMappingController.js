// src/controllers/clMappingController.js
const clMappingService = require('../services/clMappingService');
const { validateCreateClMapping } = require('../validators/clMappingValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const data = await clMappingService.listByPart(Number(req.params.partId));
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreateClMapping(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await clMappingService.createMapping(Number(req.params.partId), req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await clMappingService.deleteMapping(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, create, remove };
